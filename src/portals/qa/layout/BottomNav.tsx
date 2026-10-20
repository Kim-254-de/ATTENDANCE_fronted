import { PortalBottomNav } from '@/components/layout/PortalBottomNav'
import { nav } from './nav'

/** The small-screen counterpart to Sidebar; both render the same `nav` array. */
export function BottomNav() {
  return <PortalBottomNav items={nav} tone="violet" />
}
