/**
 * @module AwardAssets
 */

/**
 * @typedef {Object} BrandLogos
 * @property {string} drumeo - Drumeo brand logo URL
 * @property {string} singeo - Singeo brand logo URL
 * @property {string} guitareo - Guitareo brand logo URL
 * @property {string} pianote - Pianote brand logo URL
 * @property {string} musora - Musora brand logo URL
 */

/**
 * @typedef {Object} AwardAssets
 * @property {string} ribbon - Gold ribbon image URL for certificates
 * @property {string} musoraLogo - Musora logo URL
 * @property {string} musoraBgLogo - Musora background logo URL for certificates
 * @property {BrandLogos} brandLogos - Brand-specific logo URLs
 */

/**
 * Static award certificate assets.
 * URLs for images used in award certificates and badges.
 *
 * @type {AwardAssets}
 */
export const AWARD_ASSETS = {
  ribbon: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/gold_ribbon.png",
  musoraLogo: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/on_musora.png",
  musoraBgLogo: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/certificate_logo.png",

  brandLogos: {
    drumeo: "https://dpwjbsxqtam5n.cloudfront.net/logos/logo-blue.png",
    singeo: "https://d21xeg6s76swyd.cloudfront.net/sales/2021/singeo-logo.png",
    guitareo: "https://d122ay5chh2hr5.cloudfront.net/sales/guitareo-logo-green.png",
    pianote: "https://d21q7xesnoiieh.cloudfront.net/fit-in/marketing/pianote/membership/homepage/2023/pianote-logo-red.png",
    musora: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/on_musora.png"
  }
}
