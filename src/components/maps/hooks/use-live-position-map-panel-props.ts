import {
  buildSidebarPanelProps,
  type UseLivePositionMapPanelPropsOptions,
} from '@/components/maps/hooks/live-position-map-panel-prop-builders'

export function useLivePositionMapPanelProps({
  state,
  data,
  runtime,
  actions,
  presentation,
}: UseLivePositionMapPanelPropsOptions) {
  return {
    sidebarPanelProps: buildSidebarPanelProps({
      state,
      data,
      runtime,
      actions,
      presentation,
    }),
  }
}
