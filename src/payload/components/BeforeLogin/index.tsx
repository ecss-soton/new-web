import React from 'react'
import { Button } from 'payload/components'

const OAuthButton: React.FC = () => {
  return (
    <div style={{ marginBottom: 20 }} className="custom">
      <Button el="anchor" url="/login?redirect=/admin">
        Sign in with oAuth
      </Button>
    </div>
  )
}

export default OAuthButton
