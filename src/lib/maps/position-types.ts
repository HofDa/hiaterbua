/**
 * A single GPS fix. `accuracy` is the reported horizontal accuracy in metres and
 * `timestamp` is epoch milliseconds. Used for the live position marker, enclosure
 * drawing, and walking a boundary — none of which need motion data.
 */
export type GpsPosition = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

/**
 * A GPS fix captured while tracking a grazing session, which additionally records
 * instantaneous motion (`speed`/`heading` are null when the device omits them).
 */
export type GpsTrackPosition = GpsPosition & {
  speed: number | null
  heading: number | null
}
