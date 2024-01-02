import { useState, useCallback, useEffect, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  InlineStack,
  IndexFilters,
  useSetIndexFiltersMode,
} from "@shopify/polaris";

import { getQRCodes, getQRCodeCount } from "../models/QRCode.server";
import { DiamondAlertMajor, ImageMajor } from "@shopify/polaris-icons";
import { useQRCodeContext } from "../context/QRCodeContext";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const searchParams = new URLSearchParams(request.url.split("?")[1]); // Lấy phần query string từ URL

  let qrCodes = [];
  const page = Number(searchParams.get("page")) || 1;
  const qSearch = searchParams.get("q") || "";

  const itemsPerPage = 5;
  const offset = (page - 1) * itemsPerPage;

  qrCodes = await getQRCodes(
    session.shop,
    admin.graphql,
    itemsPerPage,
    offset,
    qSearch.trim() !== "" ? qSearch : ""
  );

  const getQRCodeLength = await getQRCodeCount(session.shop);

  return json({
    qrCodes,
    getQRCodeLength,
  });
}

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
  const { qrCodes, getQRCodeLength } = useLoaderData();
  const { state, dispatch } = useQRCodeContext();
  const navigate = useNavigate();
  const [itemStrings, setItemStrings] = useState(["All"]);
  const [inputValue, setInputValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const inputValueRef = useRef(inputValue);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  const sortOptions = [
    {
      label: "Date created",
      value: "created asc",
      directionLabel: "Ascending",
    },
    {
      label: "Date created",
      value: "created desc",
      directionLabel: "Descending",
    },
    { label: "Title", value: "title asc", directionLabel: "A-Z" },
    { label: "Title", value: "title desc", directionLabel: "Z-A" },
  ];
  const [sortSelected, setSortSelected] = useState(["created asc"]);

  const handleNavigation = useCallback(
    (value) => {
      if (value.trim() !== "") {
        navigate(`/app?q=${value}`);
      } else {
        navigate(`/app`);
      }
    },
    [navigate]
  );

  //debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentInputValue = inputValueRef.current.trim();
      if (currentInputValue !== "") {
        // dispatch({ type: "SET_SEARCH_QUERY", payload: currentInputValue });
        handleNavigation(currentInputValue);
      } else {
        // dispatch({ type: "SET_SEARCH_QUERY", payload: "" });
        handleNavigation("");
      }
      console.log(state);
    }, 500);

    //cleanup
    return () => clearTimeout(timer);
  }, [inputValue, handleNavigation]);

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

  // Pagination
  const handlePrevious = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
    navigate(
      `/app?page=${currentPage - 1}${
        inputValue.trim() !== "" ? `&q=${inputValue}` : ""
      }`
    );
  };

  const handleNext = () => {
    setCurrentPage((prevPage) => prevPage + 1);
    navigate(
      `/app?page=${currentPage + 1}${
        inputValue.trim() !== "" ? `&q=${inputValue}` : ""
      }`
    );
  };

  const checkHasNext = () => {
    if (currentPage * itemsPerPage < getQRCodeLength) {
      if (qrCodes.length < itemsPerPage) {
        return false;
      }
      return true;
    }
    return false;
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
            <IndexFilters
              sortOptions={sortOptions}
              sortSelected={sortSelected}
              onSort={setSortSelected}
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
                hasNext: checkHasNext(),
                onNext: () => {
                  handleNext();
                },
                hasPrevious: currentPage > 1,
                onPrevious: () => {
                  handlePrevious();
                },
              }}
            >
              {qrCodes.map((qrCode) => (
                <QRTableRow key={qrCode.id} qrCode={qrCode} />
              ))}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
