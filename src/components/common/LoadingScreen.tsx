// Loading screen component
const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 className="text-lg font-medium text-gray-700">Loading...</h2>
      </div>
    </div>
  )
}
export default LoadingScreen
