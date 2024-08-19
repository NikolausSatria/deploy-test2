"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BsDownload } from "react-icons/bs";
import Link from "next/link";
import Popup from "../Popup";
import RouteLayout from "../../RouteLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function ProductInventoryTransaction() {
  const router = useRouter();

  const [buttonPopup, setButtonPopup] = useState(false);
  const [productInventory, setProductInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 25;

  async function getInventory(query, page) {
    setIsLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/productinventory?search=${query}&page=${page}&limit=${itemsPerPage}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await res.json();
      if (Array.isArray(response.product_inventory)) {
        setProductInventory(response.product_inventory);
      } else {
        console.error("Unexpected data format:", response);
      }
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Failed to load Product Inventory Transaction:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getInventory(searchQuery, currentPage);
  }, [searchQuery, currentPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); 
    getInventory(searchQuery, 1);
  };
  

  const handleDetails = (item) => {
    router.push(`/inventoryTransaction/details/page?id=${item}`);
  };

  async function downloadCompleteInventory() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/productinventory?allData=true`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (res.status === 200) {
        if (Array.isArray(data.product_inventory)) {
          createPdf(data.product_inventory);
        } else {
          console.error("Unexpected data format:", data);
        }
      } else {
        console.error(
          "Failed to download product inventory data:",
          data.message
        );
      }
    } catch (error) {
      console.error("Failed to fetch product inventory data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function createPdf(data) {
    const doc = new jsPDF();
    const tableColumns = ["No", "ID", "Description", "Type", "Quantity"];
    const tableRows = data.map((item, index) => [
      index + 1,
      item.id,
      item.description,
      item.type,
      item.qty.toString(),
    ]);

    doc.text("Product Transaction Report", 14, 15);
    autoTable(doc, { startY: 20, head: [tableColumns], body: tableRows });
    doc.save("product_transaction_report.pdf");
  }

  return (
    <RouteLayout>
      <div className="flex w=[75rem] h-full p-5 flex-col bg-white text-left font-sans font-medium shadow-md">
        <h1 className="font-medium text-4xl">INVENTORY TRANSACTION</h1>

        {/* Search Bar container */}
        <form className="p-7" onSubmit={handleSearch}>
          <label
            htmlFor="default-search"
            className="mb-2 text-sm font-medium text-gray-900 sr-only"
          >
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="search"
              id="default-search"
              className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-700 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search Inventory by Name"
              value={searchQuery}
              onChange={handleSearchChange}
              required
            ></input>
            <button
              type="submit"
              className="text-white absolute right-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
            >
              Search
            </button>
          </div>
        </form>

        {/* Categories Menubar */}
        <div className="flex flex-row-reverse">
          <nav className="relative z-0 inline-flex shadow-sm">
            <div className="flex justify-center items-center">
              <Link
                href="/inventoryTransaction/Product_Inventory"
                className="-ml-px relative inline-flex items-center px-4 py-2 border rounded border-gray-300 bg-blue-700 text-sm leading-5 font-medium text-white focus:z-10 focus:outline-none"
              >
                Product
              </Link>
              <Link
                href="/inventoryTransaction/Asset_Inventory"
                className="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm leading-5 font-medium text-blue-600 focus:z-10 focus:outline-none"
              >
                Asset
              </Link>
              <Link
                href="/inventoryTransaction/Material_Inventory"
                className="-ml-px relative inline-flex items-center px-4 py-2 border rounded border-gray-300 bg-white text-sm leading-5 font-medium text-blue-600 focus:z-10 focus:outline-none"
              >
                Material
              </Link>
            </div>
          </nav>
        </div>

        {/* Popup download menu */}
        <Popup trigger={buttonPopup} setTrigger={setButtonPopup}></Popup>

        {/* Main Page Container */}
        <div className="justify-center items-center min-w-[800px] max-h-screen shadow bg-white px-4 pt-5 mt-4 rounded-bl-lg rounded-br-lg overflow-y-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm leading-4 text-blue-500 tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm leading-4 text-blue-500 tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-sm leading-4 text-blue-500 tracking-wider">
                  Description
                </th>
                <th className="px-7 py-3 border-b-2 border-gray-300 text-left text-sm leading-4 text-blue-500 tracking-wider">
                  Type
                </th>
                <th className="px-7 py-3 border-b-2 border-gray-300 text-left text-sm leading-4 text-blue-500 tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-blue-500">Action
                </th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : Array.isArray(productInventory) && productInventory.length > 0 ? (
                productInventory.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                      {product.id}
                    </td>
                    <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                      {product.type}
                    </td>
                    <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                      {product.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-center">
                      <button
                        onClick={() => handleDetails(product.id)}
                        className="text-white bg-blue-500 hover:bg-blue-700 font-semibold py-1 px-2 rounded"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ): (
                <tr>
                  <td colSpan="11" className="text-center py-4">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Pagination */}
        <div className="flex justify-between items-center p-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        <button
          onClick={downloadCompleteInventory}
          className="mt-4 text-white bg-blue-500 hover:bg-blue-700 font-semibold py-2 px-4 rounded"
        >
          <BsDownload className="inline mr-2" />
          Download All
        </button>
        </div>

        
      </div>
    </RouteLayout>
  );
}

export default ProductInventoryTransaction;
