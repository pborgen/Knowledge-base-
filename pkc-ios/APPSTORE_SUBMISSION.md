# App Store Connect Submission Steps

## 1) App metadata
- App name: Knowledge Base
- Bundle ID: `com.pborgen.knowledgebase`
- Category: Productivity
- Privacy policy URL: add before submission

## 2) Xcode signing
- Open generated project in Xcode
- Select Apple Team
- Confirm automatic signing enabled
- Ensure version/build incremented

## 3) Archive + upload
1. Product → Destination → Any iOS Device
2. Product → Archive
3. In Organizer → Distribute App → App Store Connect → Upload

## 4) TestFlight
- In App Store Connect, open TestFlight tab
- Add internal testers first
- Validate core flows:
  - Backend URL save/load
  - File upload from Files app
  - Ask/answer response
  - Google sign-in + doc ingest

## 5) External testing / release
- Fill App Privacy details
- Add screenshots
- Submit TestFlight external review if needed
- Submit app version for App Review when ready
