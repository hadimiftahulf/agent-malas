# Android Release Build Signing Configuration

## Overview

This document explains the release build signing configuration for the Agent Malas Mobile app.

## Development Keystore

A development keystore has been created for testing release builds:
- **Location**: `android/app/upload-keystore.jks`
- **Alias**: `upload`
- **Passwords**: `android` (both store and key)
- **Validity**: 10,000 days

⚠️ **Important**: This is a development keystore only. For production releases, you should:
1. Generate a new keystore with strong passwords
2. Store it securely (not in version control)
3. Keep backup copies in a secure location

## Configuration Files

### key.properties
This file contains the signing credentials and is **NOT committed to version control** (listed in .gitignore).

For development, the file has been created with:
```
storePassword=android
keyPassword=android
keyAlias=upload
storeFile=../app/upload-keystore.jks
```

### key.properties.template
A template file is provided for team members to create their own `key.properties` file.

## Setting Up Signing for New Developers

1. Copy `key.properties.template` to `key.properties`:
   ```bash
   cp android/key.properties.template android/key.properties
   ```

2. Update the values in `key.properties`:
   - For development: Use the development keystore (upload-keystore.jks)
   - For production: Use your production keystore

3. Ensure the keystore file path is correct relative to the android directory

## Building Release APK

To build a signed release APK:

```bash
flutter build apk --release
```

The build system will:
- Check if `key.properties` exists
- If yes: Use the release signing configuration
- If no: Fall back to debug signing (for development convenience)

## Production Keystore Setup

For production releases, generate a new keystore:

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then update `key.properties` with:
- Strong passwords (not "android")
- Path to your production keystore
- Keep the keystore file secure and backed up

## Security Notes

- ✅ `key.properties` is in .gitignore
- ✅ `*.jks` and `*.keystore` files are in .gitignore
- ⚠️ Never commit keystores or passwords to version control
- ⚠️ Use different keystores for development and production
- ⚠️ Keep production keystores in secure, backed-up locations

## Version Information

Current app version: **1.0.0+1**
- Version name: 1.0.0
- Version code: 1

Update version in `pubspec.yaml` before each release.
