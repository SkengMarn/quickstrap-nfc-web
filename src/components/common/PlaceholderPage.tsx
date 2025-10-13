import { ReactNode } from 'react'
import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
  icon?: ReactNode
}

const PlaceholderPage = ({ title, description, icon }: PlaceholderPageProps) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon || <Construction className="h-8 w-8 text-gray-400" />}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">
          {description || 'This feature is coming soon. Stay tuned for updates!'}
        </p>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This section will be available in a future update. In the meantime, you can use the other features of the portal.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PlaceholderPage
