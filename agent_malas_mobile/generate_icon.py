#!/usr/bin/env python3
"""
Generate a simple placeholder app icon for Agent Malas Mobile
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_app_icon(size=512):
    """Create a simple app icon with a gradient background and text"""
    # Create image with blue gradient background
    img = Image.new('RGB', (size, size), color='#2196F3')
    draw = ImageDraw.Draw(img)
    
    # Draw a gradient effect (simple version)
    for i in range(size):
        # Gradient from blue to darker blue
        r = int(33 - (i / size) * 10)
        g = int(150 - (i / size) * 30)
        b = int(243 - (i / size) * 50)
        color = (r, g, b)
        draw.line([(0, i), (size, i)], fill=color)
    
    # Draw a circle in the center
    circle_margin = size // 6
    circle_bbox = [circle_margin, circle_margin, size - circle_margin, size - circle_margin]
    draw.ellipse(circle_bbox, fill='#FFFFFF', outline='#FFFFFF', width=size//40)
    
    # Draw inner circle with accent color
    inner_margin = size // 4
    inner_bbox = [inner_margin, inner_margin, size - inner_margin, size - inner_margin]
    draw.ellipse(inner_bbox, fill='#009688', outline='#009688')
    
    # Draw a checkmark symbol
    check_width = size // 20
    # Checkmark coordinates (simplified)
    check_points = [
        (size * 0.35, size * 0.5),
        (size * 0.45, size * 0.6),
        (size * 0.65, size * 0.4)
    ]
    
    # Draw checkmark lines
    draw.line([check_points[0], check_points[1]], fill='#FFFFFF', width=check_width)
    draw.line([check_points[1], check_points[2]], fill='#FFFFFF', width=check_width)
    
    return img

def main():
    # Create assets directory if it doesn't exist
    assets_dir = os.path.join(os.path.dirname(__file__), 'assets')
    os.makedirs(assets_dir, exist_ok=True)
    
    # Generate 512x512 icon
    icon = create_app_icon(512)
    icon_path = os.path.join(assets_dir, 'icon.png')
    icon.save(icon_path, 'PNG')
    print(f"Created app icon at: {icon_path}")
    
    # Also create a 1024x1024 version for higher resolution
    icon_large = create_app_icon(1024)
    icon_large_path = os.path.join(assets_dir, 'icon_1024.png')
    icon_large.save(icon_large_path, 'PNG')
    print(f"Created large app icon at: {icon_large_path}")

if __name__ == '__main__':
    main()
