# WebMCP Challenge submission readiness checklist

This checklist maps the current project to the official challenge requirements. Final Devpost review and submission remain entrant-controlled actions.

Source of truth: [Official rules](https://webmcp.devpost.com/rules). Submission deadline: September 3, 2026 at 1:00 PM Pacific Time (September 4 at 4:00 AM in Taiwan).

## Entrant eligibility

- [x] The entrant confirms they reached the age of majority where they reside before entry.
- [x] Taiwan is listed as an OpenAI API-supported territory and is not named in the challenge exclusion list.
- [x] The entrant confirms they are not a sponsor, administrator, judge, excluded related party, or subject to a real or apparent conflict of interest.
- [x] The entrant confirms the project was not developed or derived with financial or preferential development support from OpenAI or Devpost.
- [x] A single eligible individual may enter without a team.
- [x] The project was created during the submission period; the public Git history begins on 2026-08-28.
- [x] No purchase or payment is required to enter.

## Required project and access

- [x] WebMCP-powered web application with a non-trivial five-tool implementation.
- [x] Public live URL: <https://release-evidence-room.vercel.app/>.
- [x] Public `/checkout` target requires no account, card, credential, or payment.
- [x] The project is currently accessible free of charge and without login restrictions.
- [ ] The entrant keeps the live app, public repository, and public video free and accessible through the end of judging: 2026-09-22 at 8:00 AM in Taiwan.
- [x] The deployed root and `/checkout` routes return HTTP 200.
- [x] The production bundle accesses `document.modelContext`, invokes `registerTool`, and contains all five documented tool names.
- [x] A clean-state native run passed in ChatGPT's in-app browser on 2026-08-29.

## Public repository and intellectual property

- [x] Public repository: <https://github.com/Eason0in/release-evidence-room>.
- [x] Default branch contains source, assets required to run the app, setup instructions, testing instructions, and judge walkthrough.
- [x] MIT `LICENSE` exists and GitHub detects it as the repository license.
- [x] Project claims are limited to original, synthetic, page-owned behavior.
- [x] No company, customer, student, credential, raw packet, TestLink, or Charles data is included.
- [x] The entrant confirms ownership of the project and authorization for every third-party dependency and submitted asset.

## Verification and quality

- [x] `npm test`: 88 tests pass.
- [x] `npm run build`: TypeScript and Vite build pass.
- [x] Lint: not configured as a separate script; strict TypeScript checking runs as part of `npm run build`.
- [x] `npm run test:e2e`: the complete browser integration path passes.
- [x] `npm audit --audit-level=high`: zero vulnerabilities.
- [x] Native tool discovery returns exactly five documented tools.
- [x] Human approval is required before verification.
- [x] Idempotent replay, stale-state rejection, READY guard, bounded monkey verification, final human HOLD, and reload persistence are verified.

## English submission materials

- [x] English project name, tagline, description, testing instructions, README, and judge walkthrough are prepared.
- [x] The description explains WebMCP fit, user experience, human-agent collaboration, and implementation.
- [x] Live URL, repository URL, claims, evidence IDs, tool names, and expected state versions agree across the docs.
- [x] All synthetic and bounded-result limitations are stated without claiming a real duplicate charge.

## Demo video

- [x] Final recording is 2:45.14, below the three-minute limit.
- [x] The video has English audio and English captions.
- [x] The video clearly shows the project functioning and how WebMCP is used.
- [x] The video shows the five-tool boundary, human approval, verification guards, and human-confirmed HOLD.
- [x] Full decode, SHA-256 checksum, caption, privacy, and independent QA checks pass.
- [x] No browser sidebar, account data, credentials, private company data, copyrighted music, or partner logos are included.
- [x] Upload the verified recording to YouTube and make it publicly visible: <https://youtu.be/PyDhC1ju_pw>.
- [x] Add the public YouTube URL to `docs/submission-draft.md` and README.
- [x] Add the public YouTube URL to the Devpost form.

## Devpost handoff

- [x] Entrant logs in to or creates a free Devpost account.
- [x] Join the WebMCP Challenge and complete entrant registration.
- [x] Confirm `Individual` submitter type, `Taiwan` residence, and `New` app status.
- [x] Fill project name, tagline, story, technology tags, live URL, repository URL, testing instructions, public YouTube URL, and AI-use disclosures.
- [x] Add the prepared thumbnail to the Devpost project overview.
- [x] Reopen every URL entered in the Devpost project draft without an authenticated session and verify public access.
- [ ] The entrant reviews and accepts the final Official Rules and Devpost Terms checkbox.
- [ ] The entrant clicks `Submit project` and verifies the submission confirmation.
