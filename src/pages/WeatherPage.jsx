import LiveWeather from "../components/LiveWeather";

export default function WeatherPage() {
  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-b from-sky-200 to-blue-500">
      <LiveWeather />
    </div>
  );
}