import {
  TextInput,
  NumberInput,
  Stack,
  Section,
  Heading,
  Button,
  PasswordInput,
} from "@carbon/react";
import { useState } from "react";
import { useAtom } from "jotai";
import { defaultAnvilConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";

export default function AnvilConfigurationForm({
  onCancel,
  onSave,
  initialConfiguration,
}) {
  const [defaultConfig] = useAtom(defaultAnvilConfigurationAtom);

  const [configForm, setConfigForm] = useState(
    initialConfiguration
      ? {
          name: initialConfiguration.name,
          anvilHost: initialConfiguration.anvil.host,
          anvilPort: initialConfiguration.anvil.port,
          anvilToken: initialConfiguration.anvil.token,
          s3Host: initialConfiguration.s3.host,
          s3Port: initialConfiguration.s3.port,
          s3Region: initialConfiguration.s3.region,
          s3Bucket: initialConfiguration.s3.bucket,
          s3AccessKeyId: initialConfiguration.s3.accessKeyId,
          s3SecretAccessKey: initialConfiguration.s3.secretAccessKey,
        }
      : {
          name: "",
          anvilHost: "",
          anvilPort: "",
          anvilToken: "",
          s3Host: "",
          s3Port: "",
          s3Region: "",
          s3Bucket: "",
          s3AccessKeyId: "",
          s3SecretAccessKey: "",
        },
  );

  function handleInputChange(e) {
    const { name, value } = e.target;
    setConfigForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSave() {
    onSave({
      name: configForm.name,
      anvil: {
        host: configForm.anvilHost,
        port: configForm.anvilPort,
        token: configForm.anvilToken,
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
  }

  function handleCancel() {
    onCancel();
  }

  return (
    <Stack gap={7}>
      <TextInput
        labelText="Name"
        placeholder={defaultConfig.name}
        name="name"
        value={configForm.name}
        onChange={handleInputChange}
      />

      <Section level={5}>
        <Heading>Anvil</Heading>
        <Stack gap={5}>
          <TextInput
            labelText="Host"
            placeholder={defaultConfig.anvil.host}
            name="anvilHost"
            value={configForm.anvilHost}
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
            value={configForm.anvilPort}
            onChange={handleInputChange}
          />
          <PasswordInput
            labelText="Token"
            placeholder={
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoieW91ciBDVEYgaXMgaW4gYW5vdGhlciBjYXN0bGUifQ.nnx_N7kOjI7lZthjjQ0lY7kXYQkluEdSBnCjI7ASsCE"
            }
            name="anvilToken"
            value={configForm.anvilToken}
            onChange={handleInputChange}
          />
        </Stack>
      </Section>

      <Section level={5}>
        <Stack gap={5}>
          <Heading>S3</Heading>
          <TextInput
            labelText="Host"
            placeholder={defaultConfig.s3.host}
            name="s3Host"
            value={configForm.s3Host}
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
            value={configForm.s3Port}
            onChange={handleInputChange}
          />
          <TextInput
            labelText="Region"
            placeholder={defaultConfig.s3.region}
            name="s3Region"
            value={configForm.s3Region}
            onChange={handleInputChange}
          />
          <TextInput
            labelText="Bucket"
            placeholder={defaultConfig.s3.bucket}
            name="s3Bucket"
            value={configForm.s3Bucket}
            onChange={handleInputChange}
          />
          <PasswordInput
            labelText="Access Key ID"
            placeholder={defaultConfig.s3.accessKeyId}
            name="s3AccessKeyId"
            value={configForm.s3AccessKeyId}
            onChange={handleInputChange}
          />
          <PasswordInput
            labelText="Secret Access Key"
            placeholder={defaultConfig.s3.secretAccessKey}
            name="s3SecretAccessKey"
            value={configForm.s3SecretAccessKey}
            onChange={handleInputChange}
          />
        </Stack>
      </Section>
      <div className="flex justify-between">
        <Button
          iconDescription="Cancel"
          tooltipAlignment="end"
          kind="secondary"
          size="md"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          iconDescription="Save"
          tooltipAlignment="end"
          kind="primary"
          size="md"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </Stack>
  );
}
