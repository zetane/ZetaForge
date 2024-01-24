'use client'

import { IconButton } from "@carbon/react"
import { ArrowRight } from "@carbon/icons-react"
import { useAtom } from "jotai"
import { libraryAtom } from "@/atoms/libraryAtom"
import { useEffect, useState } from "react"

export default function LibrarySwitcher() {
  const [showLibrary, setShowLibrary] = useAtom(libraryAtom)
  const [display, setDisplay] = useState("")

  useEffect(() => {
    if (showLibrary) {
      setDisplay("hidden")
    } else {
      setDisplay("block")
    }
  }, [showLibrary])

  const switcherStyles = `library-switcher ${display}`

  return (
    <div className={switcherStyles}>
    <IconButton kind="ghost" onClick={() => {setShowLibrary(true)}}>
      <ArrowRight/>
    </IconButton>
    </div>
  )
}