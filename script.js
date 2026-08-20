const searchInput = document.getElementById("city-input");
const searchButton = document.getElementById("get-city");
const citySuggestionsBox = document.getElementById("location-suggestions");
let resolvedLocationName = "";
const locationModal = document.getElementById("location-modal");
const locationModalMessage = document.getElementById("location-modal-message");
const closeLocationModal = document.getElementById("close-location-modal");

function showLocationModal(message) {
  locationModalMessage.innerText = message
  locationModal.hidden = false
  closeLocationModal.focus()
}

function hideLocationModal() {
  locationModal.hidden = true
  searchInput.focus()
}

closeLocationModal.addEventListener("click", hideLocationModal)
locationModal.addEventListener("click", event => {
  if (event.target === locationModal) {
    hideLocationModal()
  }
})

function hideLocationSuggestions() {
  citySuggestionsBox.hidden = true
  citySuggestionsBox.innerHTML = ""
}

function renderLocationSuggestions(items) {
  citySuggestionsBox.innerHTML = items.length
    ? items.map((item, index) => `<div class="location-suggestion-item" data-index="${index}">${item.displayName}</div>`).join("")
    : `<div class="location-suggestions-status">No matching locations.</div>`
  citySuggestionsBox.hidden = false
}

let lastSuggestions = []
let suggestionsRequestToken = 0
let suggestionsDebounce

async function fetchLocationSuggestions(query) {
  const token = ++suggestionsRequestToken
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Suggestion search failed with status ${response.status}`)
    }
    const data = await response.json()
    if (token !== suggestionsRequestToken) {
      return
    }
    lastSuggestions = (data.results || []).map(place => ({
      displayName: [place.name, place.admin1, place.admin1 ? null : place.country].filter(Boolean).join(" "),
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      admin1: place.admin1
    }))
    renderLocationSuggestions(lastSuggestions)
  } catch (error) {
    if (token !== suggestionsRequestToken) {
      return
    }
    console.error(error.message)
    citySuggestionsBox.innerHTML = `<div class="location-suggestions-status">Couldn't load suggestions.</div>`
    citySuggestionsBox.hidden = false
  }
}

function scheduleLocationSuggestions() {
  const query = searchInput.value.trim()
  clearTimeout(suggestionsDebounce)
  if (query.length < 2) {
    hideLocationSuggestions()
    return
  }
  suggestionsDebounce = setTimeout(() => fetchLocationSuggestions(query), 250)
}

searchInput.addEventListener("input", scheduleLocationSuggestions)
searchInput.addEventListener("click", scheduleLocationSuggestions)
searchInput.addEventListener("focus", scheduleLocationSuggestions)

searchInput.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    hideLocationSuggestions()
  }
})

citySuggestionsBox.addEventListener("click", event => {
  const item = event.target.closest(".location-suggestion-item")
  if (!item || !item.dataset.index) {
    return
  }
  const selected = lastSuggestions[Number(item.dataset.index)]
  if (!selected) {
    return
  }
  searchInput.value = selected.displayName
  resolvedLocationName = selected.displayName
  hideLocationSuggestions()
  getGeoWeather(selected.latitude, selected.longitude)
})

document.addEventListener("click", event => {
  if (!event.target.closest("#city-input-wrap")) {
    hideLocationSuggestions()
  }
})

async function getGeoData() {
  let search = searchInput.value.trim();
  if (!search) {
    showLocationModal("Enter a city or location to search for its weather.")
    return
  }
  hideLocationSuggestions()
  try {
    const words = search.split(/\s+/)
    const searchTerms = [...new Set([
      // prefer qualified guesses first, since the raw string can match unrelated places
      // e.g. "Springfield MO" (no comma) once matched "Wilbraham, MA" instead of Springfield, Missouri
      search.includes(",") ? search : null,
      // treat the last word as a state/country qualifier, e.g. "Springfield Illinois" -> "Springfield, Illinois"
      words.length > 1 ? `${words.slice(0, -1).join(" ")}, ${words[words.length - 1]}` : null,
      // handle two-word qualifiers, e.g. "Springfield New York" -> "Springfield, New York"
      words.length > 2 ? `${words.slice(0, -2).join(" ")}, ${words.slice(-2).join(" ")}` : null,
      search,
      words[0]
    ].filter(Boolean))]
    let location

    for (const searchTerm of searchTerms) {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`
      const information = await fetch(url)
      if (!information.ok) {
        throw new Error(`Location search failed with status ${information.status}`)
      }
      const final = await information.json()
      location = final.results?.[0]
      if (location) {
        break
      }
    }

    if (!location) {
      showLocationModal(`We couldn't find "${search}". Check the spelling and try again.`)
      return
    }
    resolvedLocationName = [location.name, location.admin1].filter(Boolean).join(" ")
    let long = location.longitude;
    let lat = location.latitude;
    getGeoWeather(lat, long);
  } catch (error) {
    console.error(error.message);
    showLocationModal("We couldn't reach the location service. Please try again.")
  }
}


async function getGeoWeather(lat, long) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,sunset,precipitation_sum,precipitation_hours,cloud_cover_mean&hourly=temperature_2m,uv_index,cloud_cover,rain&current=temperature_2m,apparent_temperature,is_day,weather_code,uv_index,precipitation,rain,cloud_cover&timezone=auto&temperature_unit=fahrenheit&precipitation_unit=inch`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    console.log(result);
    updateBoxOne(result)
    updateBoxTwo(result)
    updateBoxThree(result)
    radarLocation = { latitude: Number(lat), longitude: Number(long) }
    updateRadarMap(Number(lat), Number(long))
    updateBoxFour(result)
  } catch (error) {
    console.error(error.message);
    showLocationModal("We found the location, but its weather data is unavailable right now.")
  }
}

let radarMap;
let radarLayer;
let radarLocation;
const radarRefreshInterval = 30 * 60 * 1000;

function refreshRadar() {
  if (radarLocation) {
    updateRadarMap(radarLocation.latitude, radarLocation.longitude)
  }
}

setInterval(refreshRadar, radarRefreshInterval)

async function updateRadarMap(latitude, longitude) {
  try {
    if (typeof L === "undefined") {
      throw new Error("Leaflet could not be loaded")
    }

    if (!radarMap) {
      radarMap = L.map("radar-map", { zoomControl: true }).setView([latitude, longitude], 7)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(radarMap)
    } else {
      radarMap.setView([latitude, longitude], 7)
    }

    const radarResponse = await fetch("https://api.rainviewer.com/public/weather-maps.json")
    if (!radarResponse.ok) {
      throw new Error(`Radar response status: ${radarResponse.status}`)
    }

    const radarData = await radarResponse.json()
    const latestRadar = radarData.radar?.past?.at(-1)
    if (!latestRadar) {
      throw new Error("No radar scan is available")
    }

    const tileUrl = `https://tilecache.rainviewer.com${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`
    if (radarLayer) {
      radarMap.removeLayer(radarLayer)
    }
    radarLayer = L.tileLayer(tileUrl, { opacity: 0.65, tileSize: 256, zIndex: 10 }).addTo(radarMap)
    setTimeout(() => radarMap.invalidateSize(), 0)
  } catch (error) {
    console.error(error.message)
  }
}

function updateBoxOne(x){
  let str = x.current.time;
    time = str.split("T")[1];  //utilizing split function to split previous string from "T" and only take from "1" forward, giving us time only
    let final = document.getElementById("time");
    final.innerText = time;
  let loc = document.getElementById("location");
    loc.innerText = resolvedLocationName || searchInput.value;
    console.log(loc);
  let date = document.getElementById("date");
    let numDate = x.current.time;
    numDate = numDate.split("T")[0];
    date.innerText = numDate;
}

function updateBoxTwo(x){
  //call another function that will run an if statement to check if rain = 0 && cloudy = 0 then update text to sunny and image to sunny, else cloudy or rainy with corresponding images
  let image = document.getElementById("weather-icon")
  let tempLike = document.getElementById("temp-like")
  const weatherCode = Number(x.current.weather_code)
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(weatherCode)
  const isRaining = x.current.rain > 0 || x.current.precipitation > 0 ||
    (weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) ||
    (weatherCode >= 95 && weatherCode <= 99)

  document.body.classList.remove("weather-rain", "weather-snow", "weather-cloudy", "weather-sunny", "weather-night")

  if (isSnowing) {
    document.body.classList.add("weather-snow")
  } else if (isRaining) {
    document.body.classList.add("weather-rain")
  } else if (x.current.cloud_cover > 65) {
    document.body.classList.add("weather-cloudy")
  } else if (x.current.is_day < 0) {
    document.body.classList.add("weather-night")
  } else {
    document.body.classList.add("weather-sunny")
  }

  //let uv = document.getElementById("")
  if (isSnowing) {
  tempLike.innerText = "Snow"
  image.src = "images/snowy-1.svg"
} else if (isRaining){
  tempLike.innerText = "Rain"
  image.src = "images/rainy-3.svg"
} else if (x.current.cloud_cover > 65) {
  tempLike.innerText = "Cloudy"
  image.src = "images/cloudy.svg"
} else if (x.current.is_day < 0){
  tempLike.innerText = "Night"
  image.src = "images/clear-night.svg"
} else {
  console.log("sunny")
  tempLike.innerText = "Sunny"
  image.src = "images/clear-day.svg"
}
  const directUV = Number(x.current?.uv_index);
  const currentHour = (x.current?.time || "").slice(0, 13);
  const hourIndex = x.hourly?.time?.findIndex(t => t.startsWith(currentHour));
  const hourlyUV = hourIndex >= 0 ? Number(x.hourly.uv_index[hourIndex]) : 0;
  const currentUV = Number.isFinite(directUV) ? directUV : hourlyUV;

  document.getElementById("uv").innerText = Math.round(currentUV);
let rise = document.getElementById("sunrise")
  rise.innerText = x.daily.sunrise[0].split("T")[1]
let set = document.getElementById("sunset")
  set.innerText = x.daily.sunset[0].split("T")[1]
let temp = document.getElementById("temp")
  temp.innerText = parseInt(x.current.temperature_2m) + "°F"
let high = document.getElementById("high-low")
let highT = parseInt(x.daily.temperature_2m_max[0])
let lowT = parseInt(x.daily.temperature_2m_min[0])
high.innerText = `H: ${highT}°F L: ${lowT}°F`
}
let arrF = ["mon-forecast", "tue-forecast", "wed-forecast", 
  "thu-forecast", "fri-forecast", "sat-forecast", 
  "sun-forecast"]

let arrImage = ["mon-image", "tue-image", "wed-image", 
  "thu-image", "fri-image", "sat-image", "sun-image"]

function updateBoxThree(x) {
for (let i = 0; i < arrF.length; ++i) {
  let z = arrF[i]
  let y = document.getElementById(z)
  console.log(y)
  y.innerText = parseInt(x.daily.temperature_2m_max[i]) + "°F"
  let c = arrImage[i]
  let b = document.getElementById(c)
  console.log(b)
 if (x.daily.precipitation_hours[i] > 1) {
    b.src = "images/rainy-3.svg"
  } else if (x.daily.cloud_cover_mean[i] > 55) {
    b.src = "images/cloudy.svg"
  } else {
    b.src = "images/clear-day.svg"
  }
}
}
// id="hone", "htwo", "hthree", "hfour", "hfive"
function updateBoxFour(x) {
  const hourIds = ["hone", "htwo", "hthree", "hfour", "hfive"]
  const tempIds = ["tone", "ttwo", "tthree", "tfour", "tfive"]
  const imageIds = ["ione", "itwo", "ithree", "ifour", "ifive"]
  const currentHour = (x.current?.time || "").slice(0, 13)
  const currentIndex = x.hourly?.time?.findIndex(t => t.startsWith(currentHour)) ?? -1

  if (currentIndex < 0) {
    return
  }

  for (let offset = 1; offset <= 5; offset++) {
    const hourIndex = currentIndex + offset
    const forecastTime = x.hourly.time[hourIndex]

    if (!forecastTime) {
      break
    }

    document.getElementById(hourIds[offset - 1]).innerText = forecastTime.split("T")[1].slice(0, 5)
    document.getElementById(tempIds[offset - 1]).innerText = `${Math.round(x.hourly.temperature_2m[hourIndex])}°F`

    const image = document.getElementById(imageIds[offset - 1])
    if (x.hourly.rain[hourIndex] > 0) {
      image.src = "images/rainy-3.svg"
    } else if (x.hourly.cloud_cover[hourIndex] > 55) {
      image.src = "images/cloudy.svg"
    } else {
      image.src = "images/clear-day.svg"
    }
  }
}

getGeoData();
