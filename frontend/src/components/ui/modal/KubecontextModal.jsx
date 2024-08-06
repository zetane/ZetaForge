import {Dropdown, Button, Loading, Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,} from '@carbon/react'
import {useAtom} from 'jotai'
import { useImmerAtom } from "jotai-immer";
import { choosenKubeContexts, availableKubeContexts, runningKubeContext, kubeErrors, drivers, choosenDriver} from '@/atoms/kubecontextAtom'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function KubecontextModal({isPackaged, initialLaunch, closeFunc}) {
  
  const [availableKubeContextsAtom, setAvailableKubeContexts] = useAtom(availableKubeContexts)
  const [currentKubeContext, setCurrentKubeContext] = useImmerAtom(choosenKubeContexts)
  
  const [availableDrivers] = useAtom(drivers)
  const [userDriver, setChoosenDriver] = useAtom(choosenDriver)

  useEffect(() => {
    const serverAddress = import.meta.env.VITE_EXPRESS
  
    axios.get(`${serverAddress}/get-kube-contexts`).then((res) => {
      console.log(res.data)
      console.log("CHECK FOR RES.DATA")    
      setAvailableKubeContexts(res.data)
      }).catch(err => {

      })
        
  }, [])
  


  const handleSelection = async (e) => {
    try{
    setCurrentKubeContext(draft => {
        return e.selectedItem
    })
    } catch (err) {
        console.log(err)
    }
  }

  const handleDriverSelection = async (e) => {
    setChoosenDriver(e.selectedItem)
  }

  

return (   <>
          <Table>

            <TableHead>
                <TableRow>
                  <TableHeader className='!pl-8'>
                    KubeContext
                  </TableHeader>
                  <TableHeader className='!pl-8'>
                    Driver
                  </TableHeader>
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow>
                <TableCell className='!pl-0 w-1/2'>

                <Dropdown items={availableKubeContextsAtom} onChange={handleSelection}/>
                </TableCell>
                <TableCell className='!pl-0 w-1/2'>
                <Dropdown items={availableDrivers} onChange={handleDriverSelection}/>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </>
        )
}