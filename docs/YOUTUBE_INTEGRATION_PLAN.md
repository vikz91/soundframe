# Planned Future YouTube Integration

Status: Future feature plan, recorded on 12 October 2026. Not implemented or included in v0.

Audioframe will offer an optional way to upload a locally generated video to the user's YouTube channel. Users connect YouTube, review a title and description generated from their song details, and receive confirmation after upload. The app will not provide a video library or channel-management dashboard.

The proposed approach keeps rendering local and sends the finished video directly from the browser to YouTube. A small backend handles authorization and connection storage. The upload API is straightforward; persistent authorization, recovery, and Google's verification requirements make the complete integration a moderate feature. Zero additional operating cost may be achievable at small scale, but is not guaranteed.

This plan extends the future options in [v0 product decisions](V0_DECISIONS.md). It does not change the current release scope or the [browser media architecture](MEDIA_PIPELINE_ARCHITECTURE.md).

## Proposed user flow

Generate locally → connect YouTube → review details and visibility → upload → receive confirmation and a YouTube link.

1. Generate a video through the existing editor and export flow. Local download remains available independently of YouTube.
2. Select **Upload to YouTube**. On first use, authorize access through Google and select the intended YouTube account or channel. A Google account must have a YouTube channel to receive uploads.
3. Prefill the upload title and description from the song title, artist or author, album, and website. Let the user edit both fields.
4. Default visibility to **Unlisted**, while allowing **Public**, **Private**, and **Unlisted**. Show the destination channel and ask the user to confirm the upload, including applicable content and audience declarations.
5. Upload with progress, cancellation, and recovery for temporary network failures. Keep the page open and in the foreground until transfer completes.
6. Show **Uploaded to YouTube. YouTube may still be processing your video.** Include the returned video link and effective visibility when available.
7. Reuse the connection for later uploads while authorization and the app session remain valid. Provide **Disconnect YouTube** and a clear reconnect flow.

Here, "no listing" means no video listing inside Audioframe. **Unlisted** is a separate YouTube visibility setting: people with the link can watch and share it; it is not private access control. YouTube requires upload clients to let users set their title, description, and visibility. Generated values are editable suggestions, not silently published metadata. See [required upload functionality](https://developers.google.com/youtube/terms/required-minimum-functionality).

## Title and description generation

Use a deterministic template for the first version. This requires no AI API or generation fee. Include only details the user supplied, omit empty fields, and let the user review the exact result before upload.

Example title:

```text
{Song title} — {Artist or author}
```

Example description:

```text
{Song title}
Artist / author: {Artist or author}
Album: {Album}
Website: {Website}
```

Do not invent authorship, ownership, licensing, or copyright claims. Additional branding or promotional text requires the user's consent. Validate titles against YouTube's 100-character limit and descriptions against its 5,000-byte UTF-8 limit; reject or offer an editable shortened value rather than silently changing submitted text. See [metadata limits](https://developers.google.com/youtube/terms/required-minimum-functionality) and [user control over published data](https://developers.google.com/youtube/terms/developer-policies).

## Proposed architecture

| Component          | Responsibility                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Browser            | Render the video, review metadata, transfer the finished file directly to YouTube, show progress and completion.       |
| Small backend      | Complete OAuth, securely store and refresh credentials, authorize upload-session creation, and disconnect connections. |
| Persistent storage | Store encrypted connection credentials and minimal upload state needed for recovery.                                   |
| YouTube            | Receive the file, process it, host it, and apply channel and platform policies.                                        |

Use YouTube's [resumable upload protocol](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol). The backend can initiate a session with the approved metadata, and the browser can send the video bytes to that session. Validate browser CORS behavior and session handling in the prototype before committing to this split. Media does not need to pass through an Audioframe server or object-storage bucket.

Preserve the active upload session on retry. When completion is uncertain, query that session before starting another upload to avoid duplicate videos. Resumable sessions eventually expire; recovery then requires a new session and access to the original output file. Browser closure or mobile suspension can interrupt transfer. Supporting uploads that continue after the browser closes would require a different media-storage and worker architecture.

An active upload must retain its output until completion or cancellation. Integrate that ownership with local output cleanup so a timer cannot remove data still needed for transfer. Do not change local rendering limits merely to add YouTube.

## Authorization and connection persistence

Use Google's authorization-code flow with offline access and start with the narrow `youtube.upload` scope. Exchange the code on the backend and keep refresh tokens there; never place client secrets or refresh tokens in browser storage, logs, or presets. Google's [code model](https://developers.google.com/identity/oauth2/web/guides/use-code-model) describes backend exchange and secure refresh-token storage.

Protect the OAuth flow against CSRF, encrypt stored credentials, and bind each connection and upload to an authenticated session. A dedicated signup screen is not required for the initial proposal: the YouTube connection can establish an app session with a secure cookie. Decide session lifetime and recovery before implementation. A different device or cleared cookies may require reconnecting.

"Authorize once" means remembering a valid grant, not permanent access. Users can revoke it, and tokens can expire. In Google's external **Testing** mode, refresh tokens normally expire after seven days. Handle expired or revoked grants with **Reconnect YouTube**. See [offline access](https://developers.google.com/identity/protocols/oauth2/web-server#offline) and [token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

Verify how to display the destination channel without over-requesting permissions. If channel identification or later processing checks require `youtube.readonly`, justify that additional scope during verification. Disconnect should revoke the grant and remove associated stored credentials and upload state without deleting videos already on YouTube. Define retention and deletion rules in the privacy policy before launch.

## Upload completion and notifications

The initial feature uses an in-app success notification after YouTube accepts the complete upload and returns a video ID. This does not prove processing completion, playback availability, or freedom from later rejection or copyright restrictions. YouTube exposes separate `uploaded`, `processed`, `failed`, and `rejected` states. See [video status](https://developers.google.com/youtube/v3/docs/videos).

Email, push, and a later **Ready to watch** notification are optional follow-up work. They require a notification destination, appropriate permission, durable upload records, and background processing-status checks. They cannot keep an unfinished browser transfer running after the page closes.

YouTube's `notifySubscribers` parameter controls notifications to channel subscribers, not confirmation to the uploader. The proposal uses `notifySubscribers=false`; Audioframe supplies its own completion message. See [upload parameters](https://developers.google.com/youtube/v3/docs/videos/insert).

## Cost and quota assumptions

| Area                           | Initial expectation                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| YouTube API                    | No documented per-upload price; access is governed by approved quotas.                                |
| Media rendering                | Runs on the user's device, following the existing architecture.                                       |
| Media transfer                 | Browser sends the video to YouTube, avoiding Audioframe media storage and server bandwidth.           |
| Metadata generation            | Local templates, with no AI-service charge.                                                           |
| Backend and credential storage | May fit hosting and database free allowances at low usage; provider terms and limits must be checked. |
| Completion notification        | In-app feedback needs no separate delivery service. Email or push may introduce costs.                |

As of 12 October 2026, Google's current documentation gives each project a default of **100 `videos.insert` calls per day**, in a separate upload quota bucket, plus **10,000 daily units for other endpoints**. Upload quota is shared across the app's users, not granted separately to each connected channel. Daily quota resets at midnight Pacific Time. Actual allocation must be checked in Google Cloud Console; individual channels also have upload limits. See [quota costs](https://developers.google.com/youtube/v3/determine_quota_cost) and [upload errors](https://developers.google.com/youtube/v3/docs/videos/insert#errors).

Additional quota requires a compliance audit and an approved extension. Do not assume it can be purchased as automatic overage capacity. The cost target is **low operating cost with possible zero additional spend initially**, not unlimited free uploads or guaranteed permanent zero cost. See [quota and compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits).

## Google verification and launch requirements

Prepare a production OAuth project, verified domain, accurate consent-screen branding, privacy policy, terms, disconnect flow, scope justification, and a demonstration of the complete user flow. Plan for applicable [OAuth verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) before public launch. OAuth verification and YouTube quota audits are separate processes.

The current [upload reference](https://developers.google.com/youtube/v3/docs/videos/insert) says videos from unverified API projects are not restricted to private viewing. Older official guidance records a private-only restriction. Confirm actual Unlisted behavior with the intended project and channel during the prototype; do not promise visibility based only on conflicting documentation.

Before enabling uploads, update product privacy language to explain the optional transfer to YouTube and storage of connection credentials. Let users confirm applicable community-guideline compliance and made-for-kids settings; add other disclosures when their content requires them. Uploading does not exempt music or artwork from YouTube's copyright and content policies. See [YouTube developer policy guidance](https://developers.google.com/youtube/terms/developer-policies-guide).

## Delivery stages and acceptance criteria

1. **Prototype:** connect a test channel, upload a locally generated output directly from a browser, confirm its actual channel and visibility, and test refresh-token reuse. Establish the minimum scopes and supported browsers.
2. **Initial feature:** implement editable metadata, visibility selection, secure connection persistence, resumable uploads, reconnect/disconnect, quota errors, and in-app completion.
3. **Public launch:** complete applicable verification, publish privacy and terms updates, confirm hosting allowances and retention rules, and verify the full user flow.
4. **Optional later work:** processing-completion checks and email or push notifications. A video library, analytics, scheduling, and server media storage remain outside this plan's initial scope.

Acceptance requires evidence that:

- MP4 and WebM outputs upload and play with audio on YouTube from supported desktop and mobile browsers.
- The selected channel, edited metadata, and actual visibility match the user's confirmation.
- Authorization survives later visits when the grant and session remain valid; revocation and expiry produce a working reconnect path.
- Cancellation, network interruption, uncertain completion, and session expiry recover without unintended duplicate uploads.
- Missing channels, denied consent, quota exhaustion, and channel upload limits produce clear errors while preserving local download.
- The success notification appears only after confirmed upload acceptance and does not imply completed processing.
- Disconnect removes stored connection data, and logs, presets, and browser storage do not expose refresh tokens or secrets.

The feature remains planned until these checks and launch requirements are satisfied. Select the backend/storage provider, connection retention, and any notification channel during implementation planning.
