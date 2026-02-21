# PKCiOS (Native iPhone app)

Native SwiftUI iPhone app for the Personal Knowledge Copilot backend.

## Features
- Ask the knowledge base (`/api/answer`)
- Upload files from iPhone Files app (`/api/ingest/upload`)
- Google Sign-In + Google Doc ingestion (`/api/ingest/google-doc`)

## Generate Xcode project
This app uses **XcodeGen**.

```bash
brew install xcodegen
cd pkc-ios
xcodegen generate
open PKCiOS.xcodeproj
```

## iOS setup required
1. In Google Cloud Console, create iOS OAuth app + Web OAuth app.
2. Add `GoogleService-Info.plist` to app target.
3. In Xcode target settings:
   - URL Types: add reversed client ID from plist.
4. Ensure backend is reachable from iPhone:
   - Example: `http://192.168.1.50:8787`

## Backend expected
Run backend from `pkc-mcp`:

```bash
npm run dev:http
```

Then set backend URL in app first screen.
