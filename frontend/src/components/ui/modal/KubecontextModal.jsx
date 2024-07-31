import {Dropdown, Button, Loading, Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,} from '@carbon/react'
import {useAtom} from 'jotai'
import { useImmerAtom } from "jotai-immer";
import ClosableModal from './ClosableModal';
import { choosenKubeContexts, availableKubeContexts, runningKubeContext, kubeErrors, drivers, choosenDriver} from '@/atoms/kubecontextAtom'
import { defaultAnvilConfigurationAtom } from '@/atoms/anvilConfigurationsAtom';
import { useState, useEffect } from 'react'
import axios from 'axios'
import {trpc} from '@/utils/trpc'
import { useImmer } from 'use-immer';
export default function KubecontextModal({isPackaged, initialLaunch, closeFunc}) {
  const [showModal, setShowModal] = useState(false)
  const [availableKubeContextsAtom, setAvailableKubeContexts] = useAtom(availableKubeContexts)
  const [allKubecontexts, setAllKubeContexts] = useState([])
  const [defaultAnvilConfiguration] = useAtom(defaultAnvilConfigurationAtom)
  const [currentKubeContext, setCurrentKubeContext] = useImmerAtom(choosenKubeContexts)
  const [currentRunningKubeContext, setCurrentRunningKubeContext] = useAtom(runningKubeContext)
  const [errValidMessages, setErrMessage] = useAtom(kubeErrors)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setIsLoading] = useState(false)
  const [availableDrivers] = useAtom(drivers)
  const [userDriver, setChoosenDriver] = useAtom(choosenDriver)

  useEffect(() => {
    const serverAddress = import.meta.env.VITE_EXPRESS
        
    axios.get(`${serverAddress}/get-kube-contexts`).then((res) => {
      console.log("CHECK KUBES")
      console.log(res.data)
      setAvailableKubeContexts(res.data)
      }).catch(err => {
        console.log(err)
        })
        
  }, [])
  

  const submit = async () => {
    setIsLoading(true)
    const serverAddress = import.meta.env.VITE_EXPRESS

    console.log("SUBMIT")
    console.log(currentKubeContext)
    const reqBody = {
        host: defaultAnvilConfiguration.host,
        anvilPort: defaultAnvilConfiguration.anvilPort,
        KubeContext: currentKubeContext,
        s3Port: defaultAnvilConfiguration.s3Port,
    }
    
    try {
        console.log("CHANGE ANVIL CONFIG")
        console.log(reqBody)
        const executeAnvil = await axios.post(`${serverAddress}/launch-anvil`, reqBody)
        if(executeAnvil.status !== 200) {
            console.log("ERROR CREAATING ANVIL EXEC")
            setIsLoading(false)
        } else{
            console.log("ANVIL LAUNCH SUCCESSFULLLLLLLL")
            setIsLoading(false)
            closeFunc()
            setCurrentKubeContext('')
            setChoosenDriver('')
        }
        console.log("ERROR LAUNCH ANVIL HERE")
        setIsLoading(false)
    } catch(err) {
        console.log("ERROR LAUNCH ANVIL")
        console.log(err.response.data)
        const errorData = err.response.data
        const errorMessages = [errorData?.err, errorData?.kubeErr]
        console.log(errorMessages)
        setErrMessage(errorMessages)
        setIsOpen(true)
        setIsLoading(false)

    }

  }

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
          <div className='err-modal'>
          
          {/* Error  */}
          <ClosableModal
        modalHeading="The following error(s) occurred:"
        passiveModal={true}
        open={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-4 p-3">
          {errValidMessages.map((error, i) => {
            return (
              <p key={"error-msg-" + i}>{error}</p>
            )
          })}
        </div>
      </ClosableModal>
      </div>
          </>
        )
}