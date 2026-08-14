//api openmeteo and nominatim

const searchInput = document.getElementById("city-input");
const searchButton = document.getElementById("get-city");
async function getGeoData() {
  let search = searchInput.value;
  const url = `https://nominatim.openstreetmap.org/search?q=${search}&format=jsonv2`
  try {
    const information = await fetch(url);
    if (!information.ok) {
      console.error(error)
    }
    const final = await information.json();
    let long = final[0].lon;
    let lat = final[0].lat;
    getGeoWeather(lat, long);
  } catch (error) {
    console.log(error);
  }
}


async function getGeoWeather(lat, long) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,sunset,precipitation_sum,precipitation_hours,cloud_cover_mean&hourly=temperature_2m,uv_index,cloud_cover,rain&current=temperature_2m,apparent_temperature,is_day,precipitation,rain,cloud_cover&timezone=America%2FChicago&temperature_unit=fahrenheit&precipitation_unit=inch`;

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
  } catch (error) {
    console.error(error.message);
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

function updateBoxTwo(x){
  //call another function that will run an if statement to check if rain = 0 && cloudy = 0 then update text to sunny and image to sunny, else cloudy or rainy with corresponding images
  let image = document.getElementById("weather-icon")
  let tempLike = document.getElementById("temp-like")
  //let uv = document.getElementById("")
  if (x.current.rain > 0){
  tempLike.innerText = "Rain"
  image.src = "images/rainy-3.svg"
} else if (x.current.cloud_cover > 65) {
  tempLike.innerText = "Cloudy"
  image.src = "images/cloudy.svg"
} else if (x.current.is_day <= 0){
  tempLike.innerText = "Night"
  image.src = "images/clear-night.svg"
} else {
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
    if (x.hourly.rain[time] > 0) {
    himage.src = "images/rainy-3.svg"
    } else if (x.hourly.cloud_cover[time] > 65) {
    himage.src = "images/cloudy.svg"
    } else {
    himage.src = "images/clear-day.svg"
    }
  }
}
