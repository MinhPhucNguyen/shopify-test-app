import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  InlineStack,
  LegacyCard,
  IndexFilters,
  useSetIndexFiltersMode,
} from "@shopify/polaris";

import { getQRCodes } from "../models/QRCode.server";
import { DiamondAlertMajor, ImageMajor } from "@shopify/polaris-icons";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const searchParams = new URLSearchParams(request.url.split("?")[1]); // Lấy phần query string từ URL
  const page = Number(searchParams.get("page")) || 1;

  const itemsPerPage = 5;
  const offset = (page - 1) * itemsPerPage;
  const qrCodes = await getQRCodes(
    session.shop,
    admin.graphql,
    itemsPerPage,
    offset
  );

  return json({
    qrCodes,
  });
}

const EmptyQRCodeState = ({ onAction }) => (
  <EmptyState
    heading="Create unique QR codes for your product"
    action={{
      content: "Create QR code",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Allow customers to scan codes and buy products using their phones.</p>
  </EmptyState>
);

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const QRTableRow = ({ qrCode }) => (
  <IndexTable.Row id={qrCode.id} position={qrCode.id}>
    <IndexTable.Cell>
      <Thumbnail
        source={qrCode.productImage || ImageMajor}
        alt={qrCode.productTitle}
        size="small"
      />
    </IndexTable.Cell>
    <IndexTable.Cell>
      <Link to={`qrcodes/${qrCode.id}`}>{truncate(qrCode.title)}</Link>
    </IndexTable.Cell>
    <IndexTable.Cell>
      {qrCode.productDeleted ? (
        <InlineStack align="start" gap="200">
          <span style={{ width: "20px" }}>
            <Icon source={DiamondAlertMajor} tone="critical" />
          </span>
          <Text tone="critical" as="span">
            product has been deleted
          </Text>
        </InlineStack>
      ) : (
        truncate(qrCode.productTitle)
      )}
    </IndexTable.Cell>
    <IndexTable.Cell>
      {new Date(qrCode.createdAt).toDateString()}
    </IndexTable.Cell>
    <IndexTable.Cell>{qrCode.scans}</IndexTable.Cell>
  </IndexTable.Row>
);

export default function Index() {
  const { qrCodes, request } = useLoaderData();
  const navigate = useNavigate();
  const [itemStrings, setItemStrings] = useState(["All"]);
  const [inputValue, setInputValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("inputValue", inputValue);
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
  }));

  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => {};

  const handleFiltersQueryChange = useCallback(
    (value) => setInputValue(value),
    []
  );

  const fetchQRCodes = async () => {
    const offset = (currentPage - 1) * itemsPerPage;
  };

  // Pagination
  const handleNext = () => {
    setCurrentPage((prevPage) => prevPage + 1);
    navigate(`/app?page=${currentPage + 1}`);
  };

  const handlePrevious = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
    navigate(`/app?page=${currentPage - 1}`);
  };

  return (
    <Page>
      <ui-title-bar title="QR codes">
        <button variant="primary" onClick={() => navigate("/app/qrcodes/new")}>
          Create QR code
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {qrCodes.length === 0 ? (
              <EmptyQRCodeState onAction={() => navigate("qrcodes/new")} />
            ) : (
              <LegacyCard>
                <IndexFilters
                  queryValue={inputValue}
                  queryPlaceholder="Searching in all"
                  onQueryChange={handleFiltersQueryChange}
                  onQueryClear={() => setInputValue("")}
                  cancelAction={{
                    onAction: onHandleCancel,
                    disabled: false,
                    loading: false,
                  }}
                  tabs={tabs}
                  filters={[]}
                  appliedFilters={[]}
                  mode={mode}
                  setMode={setMode}
                  hideFilters
                />
                <IndexTable
                  resourceName={{
                    singular: "QR code",
                    plural: "QR codes",
                  }}
                  itemCount={qrCodes.length}
                  headings={[
                    { title: "Thumbnail", hidden: true },
                    { title: "Title" },
                    { title: "Product" },
                    { title: "Date created" },
                    { title: "Scans" },
                  ]}
                  selectable={false}
                  pagination={{
                    hasNext: true,
                    onNext: () => {
                      handleNext();
                    },
                    hasPrevious: true,
                    onPrevious: () => {
                      handlePrevious();
                    },
                  }}
                >
                  {qrCodes.map((qrCode) => (
                    <QRTableRow key={qrCode.id} qrCode={qrCode} />
                  ))}
                </IndexTable>
              </LegacyCard>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
