import {
  buildSidebarPanelProps,
  buildWorkflowPanelsProps,
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
    workflowPanelsProps: buildWorkflowPanelsProps({ state, data, actions, presentation }),
    sidebarPanelProps: buildSidebarPanelProps({
      state,
      data,
      runtime,
      actions,
      presentation,
    }),
  }
}
