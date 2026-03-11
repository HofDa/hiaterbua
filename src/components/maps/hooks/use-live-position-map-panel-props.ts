import {
  buildCanvasPanelProps,
  buildSidebarPanelProps,
  buildStatusCardProps,
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
    statusCardProps: buildStatusCardProps({ state, presentation }),
    canvasPanelProps: buildCanvasPanelProps({ state, data, runtime, actions }),
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
