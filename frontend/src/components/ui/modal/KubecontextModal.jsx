import {
  Dropdown,
  Button,
  Loading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useAtom } from "jotai";
import {
  choosenKubeContexts,
  availableKubeContexts,
  drivers,
  chosenDriver,
} from "@/atoms/kubecontextAtom";
import { useEffect } from "react";
import axios from "axios";

export default function KubecontextModal(props) {
  const [availableKubeContextsAtom, setAvailableKubeContexts] = useAtom(
    availableKubeContexts,
  );
  const [, setCurrentKubeContext] = useAtom(choosenKubeContexts);

  const [availableDrivers] = useAtom(drivers);
  const [, setChosenDriver] = useAtom(chosenDriver);

  useEffect(() => {
    const serverAddress = import.meta.env.VITE_EXPRESS;

    axios
      .get(`${serverAddress}/get-kube-contexts`)
      .then((res) => {
        setAvailableKubeContexts(res.data);
      })
      .catch((err) => {});
  }, []);

  const handleSelection = async (e) => {
    try {
      setCurrentKubeContext(e.selectedItem);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDriverSelection = async (e) => {
    setChosenDriver(e.selectedItem);
  };

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader className="!pl-8">KubeContext</TableHeader>
          <TableHeader className="!pl-8">Driver</TableHeader>
        </TableRow>
      </TableHead>

      <TableBody>
        <TableRow>
          <TableCell className="w-1/2 !pl-0">
            <Dropdown
              items={availableKubeContextsAtom}
              onChange={handleSelection}
            />
          </TableCell>
          <TableCell className="w-1/2 !pl-0">
            <Dropdown
              items={availableDrivers}
              onChange={handleDriverSelection}
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
