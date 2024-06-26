import {
  TextInput,
  NumberInput,
  Stack,
  Section,
  Heading,
  Button,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useState } from "react";
import { useAtom } from "jotai";
import {
  addConfigurationAtom,
  defaultAnvilConfigurationAtom,
} from "@/atoms/anvilConfigurationsAtom";

export default function AnvilConfigurationForm({
  onClose,
  initialConfiguration,
}) {
  const [defaultConfig] = useAtom(defaultAnvilConfigurationAtom);
  const [, addConfig] = useAtom(addConfigurationAtom);

  const [configForm, setConfigForm] = useState(
    initialConfiguration ?? {
      name: "",
      anvilHost: "",
      anvilPort: undefined,
      s3Host: "",
      s3Port: undefined,
      s3Region: "",
      s3Bucket: "",
      s3AccessKeyId: "",
      s3SecretAccessKey: "",
    },
  );

  function handleInputChange(e) {
    const { name, value } = e.target;
    console.log(name, value);
    setConfigForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSave() {
    console.log(configForm);
    addConfig({
      name: configForm.name,
      anvil: {
        host: configForm.anvilHost,
        port: configForm.anvilport,
      },
      s3: {
        host: configForm.s3Host,
        port: configForm.s3Port,
        region: configForm.s3Region,
        bucket: configForm.s3Bucket,
        accessKeyId: configForm.s3AccessKeyId,
        secretAccessKey: configForm.s3SecretAccessKey,
      },
    });
    onClose();
  }

  function handleCancel() {
    onClose();
  }

  return (
    <Stack gap={5}>
      <TextInput
        labelText="Name"
        placeholder={defaultConfig.name}
        name="name"
        onChange={handleInputChange}
      />

      <Section level={5}>
        <Heading>Anvil</Heading>
        <Stack gap={1}>
          <TextInput
            labelText="Host"
            placeholder={defaultConfig.anvil.host}
            name="anvilHost"
            onChange={handleInputChange}
          />
          <NumberInput
            label="Port"
            placeholder={defaultConfig.anvil.port}
            allowEmpty
            hideSteppers
            min={0}
            max={65535}
            name="anvilPort"
            onChange={handleInputChange}
          />
        </Stack>
      </Section>

      <Section level={5}>
        <Stack gap={1}>
          <Heading>S3</Heading>
          <TextInput
            labelText="Host"
            placeholder={defaultConfig.s3.host}
            name="s3Host"
            onChange={handleInputChange}
          />
          <NumberInput
            label="Port"
            placeholder={defaultConfig.s3.port}
            allowEmpty
            hideSteppers
            min={0}
            max={65535}
            name="s3Port"
            onChange={handleInputChange}
          />
          <TextInput
            labelText="Region"
            placeholder={defaultConfig.s3.region}
            name="s3Region"
            onChange={handleInputChange}
          />
          <TextInput
            labelText="Bucket"
            placeholder={defaultConfig.s3.bucket}
            name="s3Buket"
            onChange={handleInputChange}
          />
          <TextInput
            labelText="Access Key ID"
            placeholder={defaultConfig.s3.accessKeyId}
            name="s3AccessKeyId"
            onChange={handleInputChange}
          />
          <TextInput
            labelText="Secret Access Key"
            placeholder={defaultConfig.s3.secretAccessKey}
            name="s3SecretAccessKey"
            onChange={handleInputChange}
          />
        </Stack>
      </Section>
      <div className="flex justify-between">
        <Button
          renderIcon={Add}
          iconDescription="Add"
          tooltipAlignment="end"
          kind="ghost"
          size="sm"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          renderIcon={Add}
          iconDescription="Add"
          tooltipAlignment="end"
          size="sm"
          onClick={handleSave}
        >
          Submit
        </Button>
      </div>
    </Stack>
  );
}
