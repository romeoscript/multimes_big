import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TelegramManager from './TelegramManager'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <TelegramManager />
    </>
  )
}

export default App
