// Same rules as backend/src/validate.js and the build-app workflow (Parts 0.4 and 6.3).

const APP_NAME_RE = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const BRANCH_RE = /^[A-Za-z0-9_.-]+$/;

function normaliseRepo(input) {
  return String(input)
    .trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

function validateForm(form) {
  const errors = {};
  if (form.name && !APP_NAME_RE.test(form.name)) {
    errors["name"] = "3-32 chars: lowercase letters, digits and hyphens. Start with a letter.";
  }
  if (form.repo && !REPO_RE.test(normaliseRepo(form.repo))) {
    errors["repo"] = "Use owner/repo or a https://github.com/owner/repo URL.";
  }
  if (form.branch && (!BRANCH_RE.test(form.branch) || form.branch.length > 100)) {
    errors["branch"] = "Letters, digits, dots, dashes and underscores only.";
  }
  const port = Number(form.port);
  if (form.port && (!Number.isInteger(port) || port < 1024 || port > 65535)) {
    errors["port"] = "A port between 1024 and 65535.";
  }
  return errors;
}

export { APP_NAME_RE, BRANCH_RE, REPO_RE, normaliseRepo, validateForm };
