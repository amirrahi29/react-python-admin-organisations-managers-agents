function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

/** True when `href` matches the current route, but not when a more specific nav href matches. */
export function isNavLinkActive(pathname: string, href: string, allHrefs: string[]) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (current === target) return true;
  if (!current.startsWith(`${target}/`)) return false;

  const hasMoreSpecificMatch = allHrefs.some((other) => {
    if (other === href) return false;
    const normalizedOther = normalizePath(other);
    if (!normalizedOther.startsWith(`${target}/`)) return false;
    return current === normalizedOther || current.startsWith(`${normalizedOther}/`);
  });

  return !hasMoreSpecificMatch;
}
