import { useState, useCallback, useMemo } from "react";
import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  BlockStack,
  Card,
  Layout,
  Page,
  Text,
  Icon,
  Autocomplete,
} from "@shopify/polaris";
import { SearchMinor } from "@shopify/polaris-icons";

import { getQRCodes } from "../../models/QRCode.server";

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;
  return json(await getQRCodes(shop, admin.graphql));
}

export default function SearchQRCodePage() {
  const navigate = useNavigate();
  const qrCodes = useLoaderData();
  const deselectedOptions = useMemo(
    () => [
      ...qrCodes.map((qrCode) => ({
        id: qrCode.id,
        value: qrCode.title,
        label: qrCode.title,
      })),
    ],
    []
  );
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);

  // console.log(deselectedOptions);

  const updateText = useCallback(
    (value) => {
      setInputValue(value);

      if (value === "") {
        setOptions(deselectedOptions);
        return;
      }

      const filterRegex = new RegExp(value, "i");
      const resultOptions = deselectedOptions.filter((option) =>
        option.label.match(filterRegex)
      );
      setOptions(resultOptions);
    },
    [deselectedOptions]
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedValue = selected.map((selectedItem) => {
        const matchedOption = options.find((option) => {
          return option.value.match(selectedItem);
        });
        return matchedOption && matchedOption.label;
      });

      console.log(selectedValue);

      const selectedOption = options.find(
        (option) => option.label === selectedValue[0]
      );

      if (selectedOption) {
        const selectedId = selectedOption.id;
        navigate(`/app/qrcodes/${selectedId}`);
      }

      setSelectedOptions(selected);
      setInputValue(selectedValue[0] || "");
    },
    [options]
  );

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      value={inputValue}
      prefix={<Icon source={SearchMinor} tone="base" />}
      placeholder="Search"
      autoComplete="off"
    />
  );

  return (
    <Page>
      <ui-title-bar title="Search QR Code" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
                <Text as={"h2"} variant="headingLg">
                  Search
                </Text>
                <BlockStack gap="500">
                  <Autocomplete
                    options={options}
                    selected={selectedOptions}
                    onSelect={updateSelection}
                    textField={textField}
                  />
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
