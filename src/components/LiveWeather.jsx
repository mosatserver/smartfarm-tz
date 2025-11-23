import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import WeatherIcon from "./WeatherIcon";
import "../styles/glass.css";

const regions = [
  { name: "Arusha", lat: -3.3667, lon: 36.6833 },
  { name: "Dar es Salaam", lat: -6.7924, lon: 39.2083 },
  { name: "Dodoma", lat: -6.1630, lon: 35.7516 },
  { name: "Geita", lat: -2.8725, lon: 32.2295 },
  { name: "Iringa", lat: -7.7667, lon: 35.7000 },
  { name: "Kagera", lat: -1.5000, lon: 31.0000 },
  { name: "Katavi", lat: -6.4833, lon: 31.1333 },
  { name: "Kigoma", lat: -4.8833, lon: 29.6333 },
  { name: "Kilimanjaro", lat: -3.0674, lon: 37.3556 },
  { name: "Lindi", lat: -10.0000, lon: 39.7167 },
  { name: "Manyara", lat: -4.3167, lon: 36.6833 },
  { name: "Mara", lat: -1.5000, lon: 34.4500 },
  { name: "Mbeya", lat: -8.9000, lon: 33.4500 },
  { name: "Morogoro", lat: -6.8240, lon: 37.6630 },
  { name: "Mtwara", lat: -10.2667, lon: 40.1833 },
  { name: "Mwanza", lat: -2.5167, lon: 32.9000 },
  { name: "Njombe", lat: -9.3333, lon: 34.7667 },
  { name: "Pemba North", lat: -5.0362, lon: 39.7452 },
  { name: "Pemba South", lat: -5.2467, lon: 39.7756 },
  { name: "Pwani", lat: -7.0000, lon: 38.9167 },
  { name: "Rukwa", lat: -8.0000, lon: 31.5000 },
  { name: "Ruvuma", lat: -10.6870, lon: 36.2630 },
  { name: "Shinyanga", lat: -3.6610, lon: 33.4210 },
  { name: "Simiyu", lat: -2.8386, lon: 34.1419 },
  { name: "Singida", lat: -4.8167, lon: 34.7500 },
  { name: "Songwe", lat: -8.9167, lon: 32.5833 },
  { name: "Tabora", lat: -5.0167, lon: 32.8000 },
  { name: "Tanga", lat: -5.0667, lon: 39.1000 },
  { name: "Unguja North", lat: -5.9394, lon: 39.2790 },
  { name: "Unguja South", lat: -6.2645, lon: 39.4135 }
];

const getCardinalDirection = (deg) => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return directions[Math.round(deg / 45) % 8];
};

const getFarmingAdvice = (temp, humidity, weatherCode) => {
  const isPrecipitating = [61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82].includes(weatherCode);
  
  if (isPrecipitating) {
    return "Rain is coming - good time for planting but delay fertilizer application.";
  }
  if (humidity >= 70 && temp >= 20 && temp <= 30) {
    return "Ideal conditions for planting most crops. The soil moisture is perfect for seed germination.";
  }
  if (temp > 35) {
    return "High temperatures detected. Water crops early morning or late evening to reduce evaporation.";
  }
  if (humidity < 50) {
    return "Low humidity detected. Consider irrigation to maintain soil moisture for your crops.";
  }
  return "Weather conditions are stable. Good time for regular farming activities.";
};

const getCropSuggestion = (region, month = new Date().getMonth()) => {
  const isLongRains = month >= 3 && month <= 5;
  const isShortRains = month >= 10 && month <= 12;
  
  const cropMap = {
    "Arusha": isLongRains ? "Wheat and barley" : "Vegetables and coffee",
    "Dar es Salaam": "Cassava and coconuts year-round",
    "Dodoma": isShortRains ? "Sunflowers and sorghum" : "Drought-resistant crops",
    "Kilimanjaro": "Coffee and bananas year-round",
    "Mbeya": isLongRains ? "Maize and beans" : "Irish potatoes",
    "Morogoro": isLongRains ? "Rice and sugarcane" : "Vegetables",
    "Mwanza": isLongRains ? "Cotton and maize" : "Cassava",
    "Singida": isShortRains ? "Sunflowers and groundnuts" : "Sorghum",
    "Tabora": isLongRains ? "Tobacco and maize" : "Cassava",
    "Tanga": isLongRains ? "Sisal and cashews" : "Spices"
  };

  return cropMap[region] || "Consult local agriculture extension officer for crop advice";
};

const getBuyerAdvice = (region, month = new Date().getMonth()) => {
  const harvestMap = {
    "Arusha": month === 7 ? "Coffee harvest starting soon" : "",
    "Dodoma": month === 6 ? "Sunflower harvest beginning" : "",
    "Mbeya": month === 8 ? "Maize harvest season" : "",
    "Mwanza": month === 9 ? "Cotton buyers needed" : "",
    "Singida": month === 7 ? "Sunflower harvest starting" : ""
  };

  return harvestMap[region] || "Check local markets for current produce prices";
};

const LiveWeather = () => {
  const [coords, setCoords] = useState(null);
  const [weatherCurrent, setWeatherCurrent] = useState(null);
  const [weatherHourly, setWeatherHourly] = useState(null);
  const [weatherDaily, setWeatherDaily] = useState(null);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState("Detecting...");
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        };
        setCoords(userCoords);
        
        const nearestRegion = regions.reduce((prev, curr) => {
          const prevDist = Math.hypot(prev.lat - userCoords.lat, prev.lon - userCoords.lon);
          const currDist = Math.hypot(curr.lat - userCoords.lat, curr.lon - userCoords.lon);
          return currDist < prevDist ? curr : prev;
        }, regions[0]);
        
        setSelectedRegion(nearestRegion);
        setUserLocation(`Near ${nearestRegion.name}`);
        setIsLoading(false);
      },
      (err) => {
        setError("Location access denied. Using default location.");
        setSelectedRegion(regions.find(r => r.name === "Dodoma"));
        setUserLocation("Dodoma (default)");
        setIsLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (!selectedRegion) return;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${selectedRegion.lat}&longitude=${selectedRegion.lon}&hourly=temperature_2m,relative_humidity_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`
        );
        const data = await res.json();
        
        if (!data.current_weather) throw new Error("Incomplete weather data");
        
        setWeatherCurrent(data.current_weather);
        setWeatherHourly(data.hourly);
        setWeatherDaily(data.daily);
        setError(null);
      } catch (err) {
        setError("Failed to load weather data. Please try again later.");
        console.error(err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedRegion]);

  const containerStyle = {
    minHeight: '100vh',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    padding: isMobile ? '20vh 16px 16px 16px' : '32px',
    background: '#f0f4f8' // Light blue-gray background
  };

  const contentStyle = {
    maxWidth: isMobile ? '100%' : '1290px',
    margin: '0 auto',
    width: '100%'
  };

  const gridLayout = isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-6';

  if (isLoading) {
    return (
      <div style={containerStyle} className="flex items-center justify-center">
        <div className="text-center p-6 bg-[#e6f0f7] rounded-xl shadow-md max-w-sm w-full border border-[#c8d9e8]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-800">Detecting your location...</p>
          <p className="text-sm text-gray-600">Please enable location services</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle} className="flex items-center justify-center">
        <div className="text-center p-6 bg-[#e6f0f7] rounded-xl shadow-md max-w-md w-full border border-[#c8d9e8]">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold mb-2 text-gray-800">Location Error</h3>
          <p className="mb-4 text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!weatherCurrent || !weatherHourly || !weatherDaily) {
    return (
      <div style={containerStyle} className="flex items-center justify-center">
        <div className="text-center p-6 bg-[#e6f0f7] rounded-xl shadow-md max-w-md w-full border border-[#c8d9e8]">
          <div className="animate-pulse flex justify-center">
            <div className="h-12 w-12 bg-[#d4e3f0] rounded-full"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-800">Loading weather data...</p>
        </div>
      </div>
    );
  }

  const { 
    temperature: currentTemp, 
    windspeed: windSpeed, 
    winddirection: windDirection, 
    weathercode: currentCode 
  } = weatherCurrent;

  const currentHour = new Date().getHours();
  const currentHumidity = weatherHourly.relative_humidity_2m[currentHour] || 0;

  const hourlyForecast = Array.from({ length: 6 }, (_, i) => {
    const idx = (currentHour + i) % 24;
    return {
      time: new Date().setHours(idx, 0, 0, 0),
      temp: weatherHourly.temperature_2m[idx],
      code: weatherHourly.weathercode[idx],
      humidity: weatherHourly.relative_humidity_2m[idx]
    };
  });

  const dailyForecast = Array.from({ length: 3 }, (_, i) => ({
    date: new Date(weatherDaily.time[i]),
    maxTemp: weatherDaily.temperature_2m_max[i],
    minTemp: weatherDaily.temperature_2m_min[i],
    code: weatherDaily.weathercode[i]
  }));

  const farmingAdvice = getFarmingAdvice(currentTemp, currentHumidity, currentCode);
  const cropSuggestion = getCropSuggestion(selectedRegion.name);
  const buyerAlert = getBuyerAdvice(selectedRegion.name);

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div className="text-center mb-6"style={isMobile ? {paddingTop: '10vh', marginBottom: '2rem'} : {marginTop: '14rem'}}>
          <h1 className="text-2xl font-bold text-gray-800">SmartFarm TZ</h1>
          <p className="text-gray-600 mb-3">Weather & Farming Assistant</p>
          <div className="mb-4">
            <select
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm max-w-md mx-auto bg-black"
              value={selectedRegion?.name || ""}
              onChange={(e) => {
                const region = regions.find(r => r.name === e.target.value);
                setSelectedRegion(region);
              }}
            >
              {regions.map(region => (
                <option key={region.name} value={region.name}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={gridLayout}>
          {/* Current Weather */}
          <div className="bg-[#e6f0f7] rounded-xl shadow-md p-6 border border-[#c8d9e8]">
            <h2 className="text-xl font-bold text-center mb-3 text-gray-800">{selectedRegion?.name}</h2>
            <div className="flex justify-center items-center mb-4">
              <WeatherIcon code={currentCode} className="w-20 h-20 text-blue-600" />
              <span className="text-5xl font-bold ml-4 text-gray-800">{currentTemp}°C</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#d4e3f0] p-3 rounded-lg text-center border border-[#b8d0e5]">
                <p className="text-sm text-gray-600">Humidity</p>
                <p className="font-semibold text-lg text-gray-800">{currentHumidity}%</p>
              </div>
              <div className="bg-[#d4e3f0] p-3 rounded-lg text-center border border-[#b8d0e5]">
                <p className="text-sm text-gray-600">Wind</p>
                <p className="font-semibold text-lg text-gray-800">
                  {windSpeed} m/s {getCardinalDirection(windDirection)}
                </p>
              </div>
            </div>
          </div>

          {/* Next 6 Hours */}
          <div className="bg-[#e6f0f7] rounded-xl shadow-md p-6 border border-[#c8d9e8]">
            <h3 className="font-bold text-lg mb-3 text-gray-800">Next 6 hours</h3>
            <div className="flex overflow-x-auto pb-2 gap-3 -mx-1 px-1">
              {hourlyForecast.map((hour, idx) => (
                <div key={idx} className="flex-shrink-0 bg-[#d4e3f0] rounded-lg p-3 text-center min-w-[80px] border border-[#b8d0e5]">
                  <p className="font-medium text-sm text-gray-700">
                    {new Date(hour.time).getHours()}:00
                  </p>
                  <WeatherIcon code={hour.code} className="w-8 h-8 mx-auto my-2 text-blue-600" />
                  <p className="text-sm font-medium text-gray-800">{hour.temp}°C</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next 3 Days */}
          <div className="bg-[#e6f0f7] rounded-xl shadow-md p-6 border border-[#c8d9e8]">
            <h3 className="font-bold text-lg mb-3 text-gray-800">Next 3 days</h3>
            <div className="space-y-3">
              {dailyForecast.map((day, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-base text-gray-800">
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <WeatherIcon code={day.code} className="w-8 h-8 text-blue-600" />
                  <div className="text-right">
                    <p className="font-medium text-base text-gray-800">{day.maxTemp}°C</p>
                    <p className="text-sm text-gray-600">{day.minTemp}°C</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Farming Advice */}
          <div className="bg-[#e6f0f7] rounded-xl shadow-md p-6 border border-[#c8d9e8]">
            <h3 className="font-bold text-lg mb-3 text-gray-800">Farming Advice</h3>
            <p className="text-base text-gray-700 mb-3">{farmingAdvice}</p>
            {cropSuggestion && (
              <p className="text-base text-gray-700 mb-3">Recommended: {cropSuggestion}</p>
            )}
            {buyerAlert && (
              <div className="mt-3 p-3 bg-[#f5e6b3] rounded-lg border border-[#e8d89b]">
                <p className="text-sm font-medium text-gray-800">{buyerAlert}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function getWeatherDescription(code) {
  const weatherMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return weatherMap[code] || "Unknown weather";
}

export default LiveWeather;