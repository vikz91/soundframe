---
name: check-dependencies
description: Audit package usage, overlap, heavy imports, and documented dependencies when asked "check dependencies" or "audit packages". Propose changes before modifying packages or lockfiles.
---

# Check dependencies

Default to a read-only report. Inspect applicable instructions, Git status, package.json, bun.lock, relevant configuration, imports, scripts, and documentation with scoped searches.

- Distinguish declared, resolved, and actually used packages. Search application, tooling, configuration, CSS, and dynamic imports before labeling a package unused. An installed CLI or peer dependency may be necessary without a source import.
- Identify overlapping packages and heavy code crossing client boundaries. Use available bundle evidence for size claims; do not invent savings from package names.
- Check version alignment and documentation mismatches. Consult installed APIs first; use current official sources when recommending upgrades or making compatibility/security claims.
- Do not install, remove, upgrade, rewrite the lockfile, or run commands that apply automatic fixes during the audit. Avoid a production build solely to obtain a speculative bundle estimate.
- Report each proposal with evidence, impact, the exact package/configuration/docs changes, compatibility risks, and appropriate checks. Treat planned media capabilities separately from package installation.
- A clear approval of the listed changes in this conversation authorizes only those changes. Honor partial approval, recheck current files, use Bun, and preserve unrelated lockfile work. Materially changed proposals need renewed scope agreement.
- Verify approved changes with relevant checks and the required build for dependency changes. Do not commit or push without explicit authorization.
