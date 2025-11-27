# K_DA Biometrics and Tracking Analysis Report

## Executive Summary

This document provides a comprehensive analysis of biometric data collection and tracking mechanisms present in the K_DA (Koda Agent CLI) application. The analysis was conducted on the deobfuscated codebase to identify potential privacy concerns and data collection practices.

## Overview

K_DA is an AI-powered CLI tool that integrates with various AI services (Koda, Gemini, etc.). Through code analysis, we have identified several data collection and tracking mechanisms that users should be aware of.

## Key Findings

### 1. Machine ID Collection (Device Fingerprinting)

**Severity**: HIGH
**Location**: `k_da_deobfuscated.js:60844-60990`

The application collects unique machine identifiers across all major operating systems:

#### macOS (`k_da_deobfuscated.js:60850-60866`)
```javascript
// Executes: ioreg -rd1 -c "IOPlatformExpertDevice"
// Extracts: IOPlatformUUID (unique hardware identifier)
```
- Reads the **IOPlatformUUID** which is a permanent hardware identifier
- This ID persists across OS reinstalls and uniquely identifies the Mac hardware

#### Linux (`k_da_deobfuscated.js:60874-60884`)
```javascript
// Reads from: /etc/machine-id or /var/lib/dbus/machine-id
```
- Collects the Linux **machine-id**, a unique identifier generated during system installation
- This ID is persistent and unique per Linux installation

#### FreeBSD (`k_da_deobfuscated.js:60893-60905`)
```javascript
// Reads from: /etc/hostid
// Or executes: kenv -q smbios.system.uuid
```
- Collects either the host ID or SMBIOS UUID
- These are permanent hardware identifiers

#### Windows (`k_da_deobfuscated.js:60915-60928`)
```javascript
// Registry query: HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid
```
- Collects the **Windows MachineGuid** from the registry
- This is a unique identifier created during Windows installation
- Persists across most system changes

### 2. OpenTelemetry Integration

**Severity**: MEDIUM
**Location**: `k_da/src/03-npm-modules.js:16550-18240`

The application includes comprehensive OpenTelemetry instrumentation:

#### Collected Metrics
- **Host Information**: hostname, architecture (`k_da_deobfuscated.js:60977-60978`)
- **Platform Data**: Operating system, platform version
- **Runtime Information**: `navigator.userAgent` (browser/Node.js version)
- **Process Details**: Runtime version, platform information

#### Telemetry Features
```javascript
// Environment variables from .env.example:301-305
OTEL_NODE_RESOURCE_DETECTORS=env,host,os
OTEL_EXPORTER_OTLP_ENDPOINT
```

Supported telemetry backends:
- **Local**: Outputs to local files
- **GCP**: Sends to Google Cloud Platform
- **OTLP**: OpenTelemetry Protocol endpoints

#### Telemetry Configuration (`k_da/src/04-app-code.js:29985-30184`)
The application provides CLI flags to control telemetry:
- `--telemetry`: Enable/disable telemetry
- `--telemetry-target`: Set target (local or gcp)
- `--telemetry-otlp-endpoint`: Custom OTLP endpoint
- `--telemetry-log-prompts`: **Log user prompts** (concerning for privacy)
- `--telemetry-outfile`: Redirect telemetry to file

**Privacy Concern**: The `--telemetry-log-prompts` option suggests that user input/prompts may be logged and transmitted, potentially including sensitive information.

### 3. Navigator/Browser Fingerprinting

**Severity**: MEDIUM
**Location**: Multiple files

The application collects browser/environment fingerprinting data:

#### User Agent Collection
Found at least 15 instances collecting `navigator.userAgent`:
- `k_da.js:61241`: Process runtime version from userAgent
- `k_da.js:78476-78495`: Browser detection (Edge, Firefox, WebKit)
- `k_da.js:183517-183518`: Platform and userAgent for environment detection

#### Platform Detection (`k_da/src/04-app-code.js:123-151`)
Extensive platform detection logic:
```javascript
navigator.platform
navigator.userAgentData?.platform
navigator.maxTouchPoints  // Detects touch devices
process.platform
```

Platform detection includes:
- macOS detection
- Windows detection
- Linux detection
- iOS/iPad detection
- Android detection

### 4. Beacon API Usage

**Severity**: LOW-MEDIUM
**Location**: `k_da.js:40157`, `k_da.js:40242`

The application uses the **Navigator.sendBeacon** API:
```javascript
navigator.sendBeacon(e, new Blob([t], r))
```

The Beacon API is commonly used for:
- Sending analytics data to servers
- Transmitting data even when page/app is closing
- Reliable delivery of telemetry data

This suggests the application may be sending tracking data to external servers.

### 5. Storage Mechanisms

**Severity**: LOW
**Files**: `k_da/src/04-app-code.js`, `k_da/src/03-npm-modules.js`

The application uses various storage mechanisms that could contain user data:
- `localStorage` (browser-based storage)
- `sessionStorage` (temporary storage)
- `IndexedDB` (structured database)
- Cookie storage

These may be used to persist:
- User preferences
- Authentication tokens
- Session data
- Configuration settings

## No Evidence of Biometric Data Collection

**Good News**: The analysis found **NO evidence** of traditional biometric data collection such as:
- ❌ Fingerprint scanning
- ❌ Facial recognition
- ❌ Voice printing
- ❌ Iris/retina scanning
- ❌ Gait analysis
- ❌ Palm recognition
- ❌ Camera/microphone access (getUserMedia)
- ❌ Geolocation tracking

## Data Flow Analysis

### Where Data Goes

Based on the telemetry configuration:

1. **Local Mode**: Data written to files
2. **GCP Mode**: Data sent to Google Cloud Platform
3. **Custom OTLP**: Data sent to configured OpenTelemetry endpoints

### What Gets Transmitted

The following data is collected and potentially transmitted:

| Data Type | Purpose | Privacy Impact |
|-----------|---------|----------------|
| Machine ID | Device identification | HIGH - Permanent device tracking |
| User Agent | Browser/runtime detection | MEDIUM - Environment fingerprinting |
| Platform Info | OS detection | LOW - General environment info |
| Hostname | Host identification | MEDIUM - May reveal network info |
| Architecture | CPU architecture | LOW - Technical specification |
| User Prompts* | Usage analytics | HIGH - May contain sensitive data |

*Only if `--telemetry-log-prompts` is enabled

## Privacy Recommendations

### For Users

1. **Disable Telemetry**: Use `--telemetry=false` flag or set in configuration
2. **Review Settings**: Check telemetry settings in config files
3. **Never Enable Prompt Logging**: Avoid `--telemetry-log-prompts=true`
4. **Monitor Network**: Use tools like Wireshark to monitor outbound connections
5. **Read .env.example**: Review all telemetry-related environment variables

### For Developers

1. **Make Telemetry Opt-In**: Change default to disabled
2. **Remove Prompt Logging**: This feature poses significant privacy risks
3. **Document Data Collection**: Clearly inform users what data is collected
4. **Provide Privacy Policy**: Explain how machine IDs are used and stored
5. **Add Data Deletion**: Provide mechanism to request data deletion
6. **Anonymize IDs**: Consider hashing or salting machine IDs
7. **Minimize Collection**: Only collect data necessary for functionality

## Configuration Files

### Relevant Files to Review

1. **`.env.example`** (lines 301-305): OpenTelemetry configuration
2. **Settings Files**: May contain telemetry preferences
3. **CLI Flags**: Runtime telemetry controls

### How to Disable Tracking

```bash
# Method 1: CLI Flag
./k_da.js --telemetry=false

# Method 2: Environment Variable
export OTEL_SDK_DISABLED=true

# Method 3: Configuration File
# Edit your settings file to set telemetry.enabled = false
```

## Compliance Considerations

### GDPR Implications

The machine ID collection may constitute **personal data** under GDPR:
- Machine IDs can identify individual devices
- Combined with other data, can identify users
- Requires explicit consent for collection
- Users have right to access and deletion

### Recommendations for Compliance

1. **Consent Banner**: Implement on first run
2. **Privacy Policy**: Link to detailed data practices
3. **Data Access Request**: Provide mechanism for users to see their data
4. **Data Deletion**: Allow users to request deletion of their machine ID
5. **Opt-Out Default**: Consider making telemetry opt-in rather than opt-out

## Technical Details

### Machine ID Collection Code References

| Platform | File Location | Line Range | Method |
|----------|---------------|------------|--------|
| macOS | k_da_deobfuscated.js | 60850-60866 | IOPlatformUUID via ioreg |
| Linux | k_da_deobfuscated.js | 60874-60884 | /etc/machine-id |
| FreeBSD | k_da_deobfuscated.js | 60893-60905 | /etc/hostid or smbios.system.uuid |
| Windows | k_da_deobfuscated.js | 60915-60928 | Registry MachineGuid |
| Detector | k_da_deobfuscated.js | 60975-60987 | Host detector sync |

### Telemetry Code References

| Feature | File Location | Line Range |
|---------|---------------|------------|
| CLI Flags | k_da/src/04-app-code.js | 29985-30184 |
| Configuration | k_da/src/04-app-code.js | 27214-27222 |
| OpenTelemetry | k_da/src/03-npm-modules.js | 16550-18240 |
| Beacon API | k_da.js | 40157, 40242 |

## Conclusion

K_DA includes significant tracking and telemetry capabilities:

**Strengths**:
- No biometric data collection
- Telemetry can be disabled
- Configuration options available

**Concerns**:
- Collects permanent machine IDs
- May log user prompts (if enabled)
- Uses Beacon API for reliable data transmission
- Extensive platform fingerprinting

**Overall Assessment**: The application includes **sophisticated telemetry and device tracking** capabilities. While not malicious, users should be aware of what data is collected and take steps to disable telemetry if privacy is a concern.

## Recommendations Summary

1. ✅ **Disable telemetry** by default
2. ✅ **Remove or strongly warn** about prompt logging feature
3. ✅ **Document all data collection** transparently
4. ✅ **Implement consent mechanisms** for GDPR compliance
5. ✅ **Provide data deletion** capabilities
6. ✅ **Consider anonymizing** machine IDs if used for analytics

---

**Analysis Date**: November 27, 2025
**Analyzed Version**: K_DA deobfuscated version from main branch
**Analysis Method**: Static code analysis of JavaScript source files
