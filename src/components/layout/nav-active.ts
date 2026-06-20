export function isNavItemActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true
  }

  if (href === '/sessions') {
    return pathname === '/session' || pathname.startsWith('/session/')
  }

  if (href === '/herds') {
    return pathname === '/herd' || pathname.startsWith('/herd/')
  }

  return false
}
