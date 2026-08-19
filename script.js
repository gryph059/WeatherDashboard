//api openmeteo and nominatim

const searchInput = document.getElementById("city-input");
const searchButton = document.getElementById("get-city");
const previewWeather = new URLSearchParams(window.location.search).get("preview");
const locationModal = document.getElementById("location-modal");
const locationModalMessage = document.getElementById("location-modal-message");
const closeLocationModal = document.getElementById("close-location-modal");

function showLocationError(location) {
  locationModalMessage.innerText = `We couldn't find "${location}". Check the spelling and try again.`;
  locationModal.hidden = false;
  closeLocationModal.focus();
}

closeLocationModal.addEventListener("click", () => {
  locationModal.hidden = true;
  searchInput.focus();
});

async function getGeoData() {
  let search = encodeURIComponent(searchInput.value.trim());
  if (!search) {
    return;
  }
  const url = `https://nominatim.openstreetmap.org/search?q=${search}&format=jsonv2`
  try {
    const information = await fetch(url);
    if (!information.ok) {
      throw new Error(`Location search failed: ${information.status}`);
    }
    const final = await information.json();
    if (final.length === 0) {
      showLocationError(searchInput.value.trim());
      return;
    }
    let long = final[0].lon;
    let lat = final[0].lat;
    getGeoWeather(lat, long);
  } catch (error) {
    console.log(error);
  }
}

getGeoData();


async function getGeoWeather(lat, long) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,sunset,precipitation_sum,precipitation_hours,snowfall_sum,cloud_cover_mean&hourly=temperature_2m,uv_index,cloud_cover,rain,snowfall,weather_code&current=temperature_2m,apparent_temperature,is_day,precipitation,rain,snowfall,weather_code,cloud_cover&timezone=auto&temperature_unit=fahrenheit&precipitation_unit=inch`

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
    updateBoxFour(result)
    updateRadarMap(Number(lat), Number(long))
    radarLocation = { latitude: Number(lat), longitude: Number(long) }
    if (["snow", "rain", "cloudy", "sunny", "night"].includes(previewWeather)) {
      setRainIntensity(0)
      setWeatherBackground(previewWeather)
    }
  } catch (error) {
    console.error(error.message);
  }
}

let radarMap;
let radarLayer;
let radarLocation;

setInterval(() => {
  if (radarLocation) {
    updateRadarMap(radarLocation.latitude, radarLocation.longitude)
  }
}, 30 * 60 * 1000)

async function updateRadarMap(latitude, longitude) {
  try {
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
    loc.innerText = searchInput.value;
    console.log(loc);
  let date = document.getElementById("date");
    let numDate = x.current.time;
    numDate = numDate.split("T")[0];
    date.innerText = numDate;
}

function setWeatherBackground(weather) {
  document.body.classList.remove("weather-snow", "weather-rain", "weather-cloudy", "weather-sunny", "weather-night")
  document.body.classList.add(`weather-${weather}`)
}

function setRainIntensity(rainAmount) {
  document.body.classList.remove("rain-light", "rain-heavy")
  if (rainAmount > 0.08) {
    document.body.classList.add("rain-heavy")
  } else if (rainAmount <= 0.02) {
    document.body.classList.add("rain-light")
  }
}

function updateBoxTwo(x){
  let image = document.getElementById("weather-icon")
  let tempLike = document.getElementById("temp-like")
  const currentWeatherCode = Number(x.current.weather_code)
  const isSnowing = Number(x.current.snowfall) > 0 || [71, 73, 75, 77, 85, 86].includes(currentWeatherCode)
  const isRaining = Number(x.current.rain) > 0 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(currentWeatherCode)
  if (isSnowing){
  setRainIntensity(0)
  setWeatherBackground("snow")
  tempLike.innerText = "Snow"
  image.src = "images/snowy-1.svg"
} else if (isRaining){
  setWeatherBackground("rain")
  setRainIntensity(Number(x.current.rain) || 0)
  tempLike.innerText = "Rain"
  image.src = "images/rainy-3.svg"
} else if (x.current.cloud_cover > 65) {
  setRainIntensity(0)
  setWeatherBackground("cloudy")
  tempLike.innerText = "Cloudy"
  image.src = "images/cloudy.svg"
  } else if (x.current.is_day < 1){
  setRainIntensity(0)
  setWeatherBackground("night")
  tempLike.innerText = "Night"
  image.src = "images/clear-night.svg"
} else {
  setRainIntensity(0)
  setWeatherBackground("sunny")
  console.log("sunny")
  tempLike.innerText = "Sunny"
  image.src = "images/clear-day.svg"
}
 const currentHour = (x.current?.time || "").slice(0, 13);
  const hourIndex = x.hourly?.time?.findIndex(t => t.startsWith(currentHour));

  const currentUV = hourIndex >= 0 ? Number(x.hourly.uv_index[hourIndex]) : 0;

  document.getElementById("uv").innerText = Math.round(currentUV.toFixed(2));
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
 if (Number(x.daily.snowfall_sum[i]) > 0 || [71, 73, 75, 77, 85, 86].includes(Number(x.daily.weather_code[i]))) {
   b.src = "images/snowy-1.svg"
  } else if (x.daily.precipitation_hours[i] > 1) {
    b.src = "images/rainy-3.svg"
  } else if (x.daily.cloud_cover_mean[i] > 55) {
    b.src = "images/cloudy.svg"
  } else {
    b.src = "images/clear-day.svg"
  }
}
}
// id="hone", "htwo", "hthree", "hfour", "hfive"
let arrH = ["hone", "htwo", "hthree", "hfour", "hfive"]
let arrT = ["tone", "ttwo", "tthree", "tfour", "tfive"]
let arrI = ["ione", "itwo", "ithree", "ifour", "ifive"]
function updateBoxFour(x) {
  let str = x.current.time;
    time = str.split("T")[1];
    time = time.split(":")[0]
    //console.log(time)
  for (let i = 0; i < 5; ++i) {
    let hTime = document.getElementById(arrH[i])
    let tTime = document.getElementById(arrT[i])
    let himage = document.getElementById(arrI[i])
    console.log(hTime)
    time = Number(time) + 1
    console.log(time)
    hTime.innerText = time + ":00"
    tTime.innerText = parseInt(x.hourly.temperature_2m[time]) + "°F"
    if (Number(x.hourly.snowfall[time]) > 0 || [71, 73, 75, 77, 85, 86].includes(Number(x.hourly.weather_code[time]))) {
    himage.src = "images/snowy-1.svg"
    } else if (x.hourly.rain[time] > 0) {
    himage.src = "images/rainy-3.svg"
    } else if (x.hourly.cloud_cover[time] > 65) {
    himage.src = "images/cloudy.svg"
    } else {
    himage.src = "images/clear-day.svg"
    }
  }
}
