import type { KakuroApi } from './index'

declare global {
  interface Window {
    kakuroApi: KakuroApi
  }
}
