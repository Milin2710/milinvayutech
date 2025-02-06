document.addEventListener("DOMContentLoaded", function () {
  const apiKey = "468c13e532e7023e736ce19428fecf48";
  const weatherApi = axios.create({
    baseURL: "https://api.openweathermap.org/data/2.5",
    timeout: 5000,
  });
  const geoApi = axios.create({
    baseURL: "https://api.openweathermap.org/geo/1.0",
    timeout: 5000,
  });

  // Get user's location weather on load
  getUserLocationWeather();

  // Handle city form submission
  document
    .getElementById("cityForm")
    .addEventListener("submit", handleCitySubmit);

  function getCachedWeatherData(city) {
    const cachedData = localStorage.getItem(city);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < 10 * 60 * 1000) {
        // 10 minutes
        return data;
      }
    }
    return null;
  }

  function cacheWeatherData(city, data) {
    const cacheItem = {
      data: data,
      timestamp: Date.now(),
    };
    localStorage.setItem(city, JSON.stringify(cacheItem));
  }

  async function getUserLocationWeather() {
    try {
      const { data: location } = await axios.get("https://ipapi.co/json");
      const { city, country_name, latitude, longitude } = location;
      updateLocationDisplay(`${city}, ${country_name}`);

      const urlCel = `/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
      const urlFar = `/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${apiKey}`;

      await Promise.all([
        fetchWeatherData(urlCel, "cel"),
        fetchWeatherData(urlFar, "far"),
      ]);
    } catch (error) {
      handleError("Error fetching user location", error);
    }
  }

  function handleError(message, error) {
    console.error(`${message}: ${error.message}`);
    // alert(`${message}: ${error.message}`);
  }

  async function getWeatherByCity(city) {
    try {
      const cachedData = getCachedWeatherData(city);
      if (cachedData) {
        updateWeatherDisplay(cachedData.celData);
        updateTemperatureDisplay("cel", cachedData.celData.main.temp);
        updateTemperatureDisplay("far", cachedData.farData.main.temp);
        updateLocationDisplay(
          `${cachedData.celData.name}, ${cachedData.celData.sys.country}`
        );
        return;
      }

      const { data } = await geoApi.get(
        `/direct?q=${city}&limit=1&appid=${apiKey}`
      );
      if (data.length > 0) {
        const { lat, lon, name, country } = data[0];
        updateLocationDisplay(`${name}, ${country}`);

        const urlCel = `/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const urlFar = `/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

        const [celData, farData] = await Promise.all([
          fetchWeatherData(urlCel, "cel"),
          fetchWeatherData(urlFar, "far"),
        ]);

        cacheWeatherData(city, { celData, farData });
      } else {
        throw new Error("City not found");
      }
    } catch (error) {
      handleError("Error fetching weather for the city", error);
    }
  }

  async function fetchWeatherData(url, unit) {
    try {
      const { data } = await weatherApi.get(url);
      if (unit === "cel") {
        updateWeatherDisplay(data);
        console.log(data);
      }
      updateTemperatureDisplay(unit, data.main.temp);
      return data;
    } catch (error) {
      handleError(`Error fetching weather data for ${unit}`, error);
    }
  }

  function updateWeatherDisplay(data) {
    const skycons = {
      day: new Skycons({ color: "gold" }),
      night: new Skycons({ color: "DarkSlateBlue" }),
      cloud: new Skycons({ color: "DodgerBlue" }),
    };

    const condId = data.weather[0].id;
    let conditions = data.weather[0].description;
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 19;

    document.getElementById("realfeel").innerText = data.main.feels_like + " °C";
    document.getElementById("humidity").innerText = data.main.humidity + " %";
    document.getElementById("wind").innerText = data.wind.speed + " m/s";
    document.getElementById("pressure").innerText = data.main.pressure + " hPa";
    document.getElementById("visibility").innerText = (data.visibility)/1000 + " km";

    const iconMap = {
      800: isNight ? "clear-night" : "clear-day",
      801: isNight ? "partly-cloudy-night" : "partly-cloudy-day",
      802: isNight ? "partly-cloudy-night" : "partly-cloudy-day",
      803: "cloudy",
      804: "cloudy",
    };

    let icon = iconMap[condId] || getIconForCondition(condId);
    let skycon = getSkyconForIcon(icon, skycons, isNight);

    skycon.set("icon", icon);
    skycon.play();

    conditions += isNight ? " night" : " day";
    document.getElementById("frame").classList.add(isNight ? "night" : "day");
    conditions = capitalizeFirstLetter(conditions) + ".";
    document.getElementById("conditions").textContent = conditions;
  }

  function getIconForCondition(condId) {
    if (condId > 300 && condId < 400) return "sleet";
    if (condId > 500 && condId < 600) return "rain";
    if (condId > 600 && condId < 700) return "snow";
    if (condId > 700 && condId < 800) return "fog";
    return "wind";
  }

  function getSkyconForIcon(icon, skycons, isNight) {
    if (icon === "clear-day" || icon === "partly-cloudy-day")
      return skycons.day;
    if (icon === "clear-night" || icon === "partly-cloudy-night")
      return skycons.night;
    return skycons.cloud;
  }

  function updateLocationDisplay(location) {
    document.getElementById("location").textContent = location;
  }

  function updateTemperatureDisplay(unit, temp) {
    document.getElementById(
      unit
    ).textContent = `${temp} °${unit.toUpperCase()}.`;
  }

  function handleCitySubmit(e) {
    e.preventDefault();
    const city = document.getElementById("cityInput").value;
    if (city.trim()) {
      getWeatherByCity(city);
    } else {
      getUserLocationWeather();
    }
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  document.getElementById("far").style.display = "none";

  function changeUnits(newUnit, oldUnit) {
    document.getElementById(`${newUnit}Button`).classList.add("active");
    document.getElementById(`${oldUnit}Button`).classList.remove("active");

    document.getElementById(oldUnit).style.display = "none";
    document.getElementById(newUnit).style.display = "block";
  }

  document
    .getElementById("celButton")
    .addEventListener("click", () => changeUnits("cel", "far"));
  document
    .getElementById("farButton")
    .addEventListener("click", () => changeUnits("far", "cel"));
});
