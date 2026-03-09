import { execa } from 'execa';
import { logger } from './logger.js';
import { config } from './config.js';

export async function fetchReadyTasks() {
  if (config.dryRun) {
    logger.info('[DRY RUN] Simulating task fetch from GitHub Project...');
    return [
      {
        id: '42',
        title: 'Add example functionality',
        description: 'This is a description from the GitHub Project task detailing what needs to be implemented.',
        repo: 'example/repo'
      }
    ];
  }

  try {
    logger.info(`Fetching globally assigned issues and checking project statuses...`);
    const query = `
      query {
        search(query: "is:issue is:open assignee:@me sort:updated-desc", type: ISSUE, first: 50) {
          nodes {
            ... on Issue {
              number
              title
              body
              url
              repository {
                nameWithOwner
              }
              projectItems(first: 5) {
                nodes {
                  id
                  project {
                    id
                    title
                  }
                  fieldValues(first: 8) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field { ... on ProjectV2SingleSelectField { id } }
                      }
                    }
                  }
                }
              }
              comments(last: 5) {
                nodes {
                  author { login }
                  body
                  createdAt
                }
              }
            }
          }
        }
      }
    `;

    const { stdout } = await execa('gh', ['api', 'graphql', '-f', `query=${query}`]);
    const data = JSON.parse(stdout);
    
    // Access the Issues
    const items = data.data?.search?.nodes || [];
    
    // Define the valid statuses we care about (case insensitive checks)
    const validStatuses = ['to do', 'todo', 'in progress', 'rejected', 'doing'];
    
    const readyIssues = [];

    for (const item of items) {
       // Check if this item has any project item associations
       if (!item.projectItems || !item.projectItems.nodes || item.projectItems.nodes.length === 0) {
         continue; // Not in any project board
       }

       let status = '';
       let projectName = '';
       let projectItemId = '';
       let projectId = '';
       // Search through project items to find the status and project name
       for (const projectItem of item.projectItems.nodes) {
         if (projectItem.project?.title) {
           projectName = projectItem.project.title;
           projectId = projectItem.project.id;
           projectItemId = projectItem.id;
         }
         if (projectItem.fieldValues && projectItem.fieldValues.nodes) {
           for (const field of projectItem.fieldValues.nodes) {
             if (field.name) {
               status = field.name.toLowerCase();
               break;
             }
           }
         }
         if (status) break;
       }

       // Check if this item's status matches our valid statuses
       const isReady = validStatuses.some(validStatus => status.includes(validStatus));

       if (isReady) {
         // Extract last comments as QA feedback context
         const comments = (item.comments?.nodes || []).map(c => ({
           author: c.author?.login || 'unknown',
           body: c.body,
           createdAt: c.createdAt
         }));

         readyIssues.push({
           id: item.number.toString(),
           title: item.title,
           description: item.body,
           repo: item.repository.nameWithOwner,
           url: item.url,
           projectName,
           projectId,
           projectItemId,
           comments
         });
       }
    }

    // Fetch all open PRs by the bot to filter out tasks that are already being worked on
    logger.info('Checking for in-progress tasks (Open PRs)...');
    const { stdout: prsStdout } = await execa('gh', ['search', 'prs', '--state=open', '--author=@me', '--json', 'title']);
    const openPRs = JSON.parse(prsStdout);
    const inProgressTaskIds = openPRs.map(pr => {
      const match = pr.title.match(/\((\d+)\)$/);
      return match ? match[1] : null;
    }).filter(id => id !== null);

    // Final filtering to ensure we don't process things we already opened a PR for
    const tasks = readyIssues.filter(issue => !inProgressTaskIds.includes(issue.id));

    return tasks;
  } catch (error) {
    logger.error(`Failed to fetch tasks from project: ${error.message}`);
    return [];
  }
}

/**
 * Update a project item's Status field to a target value (e.g. "Code Review")
 */
export async function updateProjectItemStatus(task, targetStatus) {
  if (!task.projectId || !task.projectItemId) {
    logger.warn(`Cannot update project status: missing project IDs for task ${task.id}`);
    return;
  }

  try {
    logger.info(`Moving task ${task.id} to "${targetStatus}" on project board...`);

    // Step 1: Get the Status field and its options from the project
    const fieldQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options { id name }
                }
              }
            }
          }
        }
      }
    `;
    const { stdout: fieldStdout } = await execa('gh', [
      'api', 'graphql',
      '-F', `projectId=${task.projectId}`,
      '-f', `query=${fieldQuery}`
    ]);
    const fieldData = JSON.parse(fieldStdout);
    const fields = fieldData.data?.node?.fields?.nodes || [];

    // Find the Status field (case-insensitive)
    const statusField = fields.find(f => f.name && f.name.toLowerCase() === 'status');
    if (!statusField) {
      logger.warn('Could not find Status field on project board');
      return;
    }

    // Find the target option (case-insensitive, partial match)
    const targetOption = statusField.options.find(
      opt => opt.name.toLowerCase().includes(targetStatus.toLowerCase())
    );
    if (!targetOption) {
      logger.warn(`Could not find "${targetStatus}" option. Available: ${statusField.options.map(o => o.name).join(', ')}`);
      return;
    }

    // Step 2: Mutation to update the field value
    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectV2Item { id }
        }
      }
    `;
    await execa('gh', [
      'api', 'graphql',
      '-F', `projectId=${task.projectId}`,
      '-F', `itemId=${task.projectItemId}`,
      '-F', `fieldId=${statusField.id}`,
      '-f', `optionId=${targetOption.id}`,
      '-f', `query=${mutation}`
    ]);

    logger.info(`Task ${task.id} moved to "${targetOption.name}" successfully`);
  } catch (error) {
    logger.error(`Failed to update project status for task ${task.id}: ${error.message}`);
  }
}
