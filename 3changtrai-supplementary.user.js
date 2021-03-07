// ==UserScript==
// @name         3ChangTrai Supplementary
// @namespace    3ctsupplementary
// @version      0.1.2
// @description  A script to improve user experience on 3ChangTrai
// @author       Salad
// @homepage     https://github.com/S-a-l-a-d/3changtrai-supplementary
// @supportURL   https://github.com/S-a-l-a-d/3changtrai-supplementary/issues
// @icon         https://3changtrai.com/favicon.ico
// @match        http*://3changtrai.com/*
// @resource     STYLES https://raw.githubusercontent.com/S-a-l-a-d/3changtrai-supplementary/main/styles.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  "use strict"

  const userDetails = document.querySelector("#info_block .User_Name")?.href

  // Not logged in
  if (!userDetails) return

  const REQUEST_LIMIT = 500
  const TRANSLATIONS = {
    "en": {
      WALK: "WALK",
      PUSH_UP: "PUSH-UP",
      ERROR_OCCURRED: "An error occurred",
      NUMBER_REQUESTS_INVALID: "The number of requests is invalid.",
      NUMBER_REQUESTS_EXCEEDED_LIMIT: `The number of requests has exceeded the limit of ${REQUEST_LIMIT}.`
    },
    "chs": {
      WALK: "ĐI BỘ",
      PUSH_UP: "HÍT ĐẤT",
      ERROR_OCCURRED: "Có lỗi xảy ra",
      NUMBER_REQUESTS_INVALID: "Số lượng yêu cầu không hợp lệ.",
      NUMBER_REQUESTS_EXCEEDED_LIMIT: `Số lượng yêu cầu vượt quá giới hạn ${REQUEST_LIMIT}.`
    }
  }
  const API_PATH = {
    ACTIVITY: "/activities.php",
    SHOP: "/buy.php",
    USER_DETAILS: userDetails.substr(userDetails.lastIndexOf("/"))
  }

  class Utils {
    getCookie (name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)

      if (parts.length === 2) return parts.pop().split(";").shift()
    }
  }

  const utils = new Utils()
  const LANG = TRANSLATIONS[utils.getCookie("c_lang_folder") || "chs"]

  class ApiUtils {
    fireRequest (path, data) {
      return fetch(path, { method: "POST", body: new URLSearchParams(data) })
    }

    fireRequests (path, data, num = 50) {
      const maxRequests = 100
      const body = new URLSearchParams(data)
      const batchRequest = num => Promise.all(Array(num).fill(undefined).map(() => fetch(path, { method: "POST", body })))

      if (num < 1) throw new Error(LANG.NUMBER_REQUESTS_INVALID)

      if (num > REQUEST_LIMIT) throw new Error(LANG.NUMBER_REQUESTS_EXCEEDED_LIMIT)

      if (num <= maxRequests) return batchRequest(num)

      return new Promise((resolve, reject) => {
        (function execute (count) {
          if (count === num) return resolve()

          const remaining = num - count

          batchRequest(remaining < 100 ? remaining : maxRequests)
            .then(result => execute(count + result.length))
            .catch(reject)
        })(0)
      })
    }
  }

  class ActivityService {
    constructor (apiUtils) {
      this.apiUtils = apiUtils
    }

    walk (steps) {
      return this.apiUtils.fireRequests(API_PATH.ACTIVITY, { submit: "WALK" }, steps)
    }

    pushUp (times) {
      return this.apiUtils.fireRequests(API_PATH.ACTIVITY, { submita: "PUSH-UP" }, times)
    }
  }

  class ElementService {
    create (tag, properties, events) {
      const element = document.createElement(tag)

      if (properties && Object.keys(properties).length) {
        Object.keys(properties).forEach(name => {
          element[name] = properties[name]
        })
      }

      if (events && Object.keys(events).length) {
        Object.keys(events).forEach(name => {
          element.addEventListener(name, events[name])
        })
      }

      return element
    }
  }

  const init = () => {
    const apiUtils = new ApiUtils()
    const activityService = new ActivityService(apiUtils)
    const elementService = new ElementService()

    const row = elementService.create("tr", { className: "supplementary-activity" })
    const column = elementService.create("td")
    const numInput = elementService.create("input", {
      id: "num-input",
      type: "number",
      value: 50,
      min: 1,
      max: REQUEST_LIMIT
    })
    const handleActivityClick = callback => async e => {
      const buttons = [...e.target.parentNode.querySelectorAll("button")]

      buttons.forEach(button => {
        button.disabled = true
      })

      try {
        await callback()
        window.location.reload()
      } catch (err) {
        alert(`${LANG.ERROR_OCCURRED}: ${err.message}`)
      } finally {
        buttons.forEach(button => {
          button.disabled = false
        })
      }
    }
    const walkButton = elementService.create("button", {
      textContent: LANG.WALK
    }, {
      click: handleActivityClick(() => activityService.walk(parseInt(numInput.value, 10)))
    })
    const pushUpButton = elementService.create("button", {
      textContent: LANG.PUSH_UP
    }, {
      click: handleActivityClick(() => activityService.pushUp(parseInt(numInput.value, 10)))
    })

    column.appendChild(numInput)
    column.appendChild(walkButton)
    column.appendChild(pushUpButton)
    row.appendChild(column)
    document.querySelector("#info_block > tbody > :last-child").insertAdjacentElement("beforebegin", row)
  }

  init()

  GM_addStyle(GM_getResourceText("STYLES"))
})()
