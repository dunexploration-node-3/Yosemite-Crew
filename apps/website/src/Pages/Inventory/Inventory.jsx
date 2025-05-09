import React, { useCallback, useEffect, useState } from "react";
import "./Inventory.css";
import { Container, Form, Tab, Tabs } from "react-bootstrap";
import { BoxDiv, ListSelect } from "../Dashboard/page";
// import box9 from '../../../../public/Images/box9.png';
// import box10 from '../../../../public/Images/box10.png';
// import box11 from '../../../../public/Images/box11.png';
// import box12 from '../../../../public/Images/box12.png';
// import WeeklyAppointmentsChart from '../../Components/BarGraph/WeeklyAppointmentsChart';
import DepartmentAppointmentsChart from "../../Components/BarGraph/DepartmentAppointmentsChart";
import { AiFillPlusCircle } from "react-icons/ai";
import { IoSearch } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import ProcedureTable from "../../Components/ProcedureTable/ProcedureTable";
// import Accpt from '../../../../public/Images/view.png';
// import Decln from '../../../../public/Images/delete.png';
import ManageInvetryTable from "../../Components/ManageInvetryTable/ManageInvetryTable";
import axios from "axios";
import { useAuth } from "../../context/useAuth";
import DynamicDatePicker from "../../Components/DynamicDatePicker/DynamicDatePicker";
import Swal from "sweetalert2";
import ApproachingExpiryChart from "../../Components/BarGraph/ApproachingExpiryChart";
import {
  ApproachingExpiryReportConverter,
  convertFHIRBundleToNormalFormat,
  InventoryBundleFHIRConverter,
  InventoryFHIRParser,
} from "../../utils/InventoryFHIRMapper";
import { FHIRParser } from "../../utils/FhirMapper";
import { getData } from "../../services/apiService";


function Inventory() {
  const { userId, onLogout } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [Overview, setOverview] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [procedureData, setProcedureData] = useState([]);

  const [searchItem, setSearchItem] = useState("");
  // const [stock, setStock] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [totalPages, setTotalPages] = useState(1);
  const [procedureTotalPages, setProcedureTotalPages] = useState(1);
  const [procedureCurrentPage, setProcedureCurrentPage] = useState(1);
  const [ApproachingExpiry, setApproachingExpiry] = useState([]);
  const [category, setCategory] = useState([]);

  console.log("category", category?.[0]?.value);
  const [searchCategory, setSearchCategory] = useState();

  console.log("searchCategory", searchCategory);

  useEffect(() => {
    const getInventory = async () => {
      try {
      
        const response = await getData(
          `fhir/v1/InventoryItem`,
        
          {
              userId,
              searchItem,
              expiryDate: date,

              searchCategory,
              skip: (currentPage - 1) * itemsPerPage,
              limit: itemsPerPage,
            },
           
          
        );
  
        const fhirdata = InventoryBundleFHIRConverter.fromFHIR(response.data);

        setInventoryData(fhirdata.inventory);
        setTotalPages(response.totalPages); // Ensure API returns totalCount
      } catch (error) {
        if (error.response && error.response.status === 401) {
         
          onLogout(navigate);
        } else if ([400, 500].includes(error.response.status)) {
          Swal.fire({
            type: "failed",
            text: `${error.response.data.issue[0].details.text}`,
            icon: "error",
          });
        }
      }
    };

    if (userId && category.length > 0) getInventory();
  }, [
    userId,
    searchItem,
    date,
    currentPage,
    searchCategory,
    onLogout,
    category,
    navigate,
  ]);
  const getInventoryCotegory = useCallback(async () => {
    try {
      const response = await getData(
        `fhir/admin/GetAddInventoryCategory?bussinessId=${userId}&type=category`
      );
      if (response.status === 200) {
        const res = new InventoryFHIRParser(
          response.data
        ).convertToNormaldata();
        setCategory(res);
      }
    } catch (error) {
      console.error(error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      getInventoryCotegory(userId);
    }
  }, [getInventoryCotegory, userId]);

  const handleDateChange = (selectedDate) => setDate(selectedDate);
  const handleSearch = (e) => setSearchItem(e.target.value);
  // const handleStock = (e) => setSearchItem(e.target.value);
  const handleCategory = (tab) => setSearchCategory(tab);
  // const handleNextPage = () => setCurrentPage((prev) => prev + 1);
  // const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const getProcedureData = useCallback(async () => {
    try {
    
      const response = await getData(
        `api/inventory/getProceurePackage`,
        {
          params: {
            userId,
            skip: (procedureCurrentPage - 1) * itemsPerPage,
            limit: itemsPerPage,
          },
          
        }
      );
      if (response.status === 200) {
        const data = convertFHIRBundleToNormalFormat(response.data.data);
        
        setProcedureData(data.data);
        setProcedureTotalPages(data.totalPages);
      } else {
        Swal.fire({
          type: "failed",
          text: "Failed to get procedure data ",
          icon: "error",
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("Session expired. Redirecting to signin...");
        onLogout(navigate);
      }
    }
  }, [userId, procedureCurrentPage, onLogout, navigate]);
  useEffect(() => {
    if (userId) getProcedureData();
  }, [userId, procedureCurrentPage, getProcedureData]);

  const handleDeleteItem = async (id) => {
    Swal.fire({
      title: "Are you sure you want to delete this item?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = sessionStorage.getItem("token");
          const response = await axios.delete(
            `${import.meta.env.VITE_BASE_URL}fhir/v1/ProcedurePackage/${id}`, // FHIR RESTful DELETE
            {
              headers: {
                Authorization: `Bearer ${token}`,
                // "Content-Type": "application/fhir+json"
              },
              params: {
                userId, // optional if your backend requires tracking user
              }
            }
          );
  
          if (response.status === 200) {
            Swal.fire({
              title: "Deleted!",
              text: `${response.data.issue[0].details.text}`,
              icon: "success",
            });
            getProcedureData(); // Refresh data after deletion
          } 
        } catch (error) {
          if (error.response && error.response.status === 401) {
            console.log("Session expired. Redirecting to signin...");
            onLogout(navigate);
          }else if(error.response.status ===400 || error.response.status === 404 || error.response.status === 500){
            Swal.fire({
              title: "Error",
              text: `${error.response.data.issue[0].details.text}`,
              icon: "error",
            });
          }
          
        }
      }
    });
  };
  
  const GetApproachingExpiryGraph = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}fhir/v1/getApproachngExpiryGraphs`,
        {
          params: {
            userId,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.status === 200) {
        const normaldata = ApproachingExpiryReportConverter.fromFHIR(
          response.data
        );
        console.log("ApproachingExpiryReportConverter", normaldata);

        setApproachingExpiry(
          normaldata?.map((item) => ({
            category: item.category,
            totalCount: item.totalCount,
            color:
              item.category === "7 days"
                ? "#A72A19"
                : item.category === "15 days"
                  ? "#C23723"
                  : item.category === "30 days"
                    ? "#E05D50"
                    : "#E88E81",
          }))
        );
      } else {
        console.log("error");
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("Session expired. Redirecting to signin...");
        onLogout(navigate);
      }
    }
  }, [userId, onLogout, navigate]);
  const getInventoryOverViewDetails = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}fhir/v1/InventoryReports`,
        {
          params: {
            userId,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("response.data", response.data);
      if (response.status === 200) {
        const data = new FHIRParser(
          response.data
        ).inventoryOverviewConvertToNormal();
        console.log("pppppppppp", data);
        setOverview(data);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("Session expired. Redirecting to signin...");
        onLogout(navigate);
      }
    }
  }, [userId, onLogout, navigate]);

  useEffect(() => {
    if (userId) {
      GetApproachingExpiryGraph();
      getInventoryOverViewDetails();
    }
  }, [userId, GetApproachingExpiryGraph, getInventoryOverViewDetails]);
  return (
    <section className="InventorySec">
      <Container>
        <div className="InventoryData">
          <div className="InvetHead">
            <h2>
              <span>Inventory</span> Overview
            </h2>
          </div>

          <div className="overviewDiv">
            {/* <div className="OverviewTop">
              <ListSelect
                options={[
                  'Last 7 Days',
                  'Last 10 Days',
                  'Last 20 Days',
                  'Last 21 Days',
                ]}
              />
            </div> */}
            <div className="overviewitem">
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box9.png`}
                ovradcls="purple"
                ovrtxt="Total Inventory Items"
                boxcoltext="purpletext"
                overnumb={Overview?.totalQuantity}
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box10.png`}
                ovradcls="cambrageblue"
                ovrtxt="Stock Value"
                boxcoltext="greentext"
                overnumb={Overview?.totalValue}
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box11.png`}
                ovradcls="fawndark"
                ovrtxt="Items Low on Stock"
                boxcoltext="frowntext"
                overnumb={Overview?.lowStockCount}
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box12.png`}
                ovradcls="chillibg"
                ovrtxt="Out-of-Stock Items"
                boxcoltext="ciltext"
                overnumb={Overview?.outOfStockCount}
              />
            </div>
          </div>

          <div className="InventoryGrph">
            <div className="Inventrygrphdiv">
              <h6>Approaching Expiry</h6>
              <ApproachingExpiryChart data={ApproachingExpiry} />
            </div>
            <div className="Inventrygrphdiv">
              <h6>Category Breakdown</h6>
              <ListSelect
                options={[
                  "Last 3 Months",
                  "Last 6 Months",
                  "Last 9 Months",
                  "Last 12 Months",
                ]}
              />
              <DepartmentAppointmentsChart />
            </div>
          </div>

          <div className="ManageInvtDiv">
            <div className="ManageHead">
              <h2>
                <span>Manage</span> Inventory
              </h2>
              <Link to="/AddInventory">
                <AiFillPlusCircle /> Add Inventory
              </Link>
            </div>

            <div className="ManageInvtTabs">
              <Tabs
                defaultActiveKey={category?.[0]?.value}
                onSelect={handleCategory}
                id="inventory-tabs"
                className="mb-3"
              >
                {category?.map((tab) => (
                  <Tab eventKey={tab.value} title={tab.label} key={tab.value}>
                    <div className="InvttabsInner">
                      <div className="topInner">
                        <div className="lftinnr">
                          <div className="srchbr">
                            <Form.Control
                              type="text"
                              placeholder="Search anything"
                              onChange={handleSearch}
                            />
                            <IoSearch />
                          </div>

                          {/* <Form.Select onChange={handleStock}>
            <option>Stock</option>
            <option>20</option>
            <option>30</option>
            <option>40</option>
          </Form.Select> */}

                          <DynamicDatePicker
                            onDateChange={handleDateChange}
                            placeholder="Expiry Date"
                            minDate={Date.now()}
                          />
                        </div>
                      </div>

                      <ManageInvetryTable
                        actimg1={`${import.meta.env.VITE_BASE_IMAGE_URL}/view.png`}
                        actimg2={`${import.meta.env.VITE_BASE_IMAGE_URL}/delete.png`}
                        inventoryData={inventoryData}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                        setTotalPages={setTotalPages}
                      />
                    </div>
                  </Tab>
                ))}
              </Tabs>
            </div>
          </div>
          <div className="ProcedurePackDiv">
            <div className="ProcdpkgHead">
              <h4>Procedure Packages</h4>
              <Link to="/AddProcedurePackage">
                <AiFillPlusCircle /> Create New
              </Link>
            </div>
            <div className="Prof">
              <ProcedureTable
                actimg1={`${import.meta.env.VITE_BASE_IMAGE_URL}/view.png`}
                actimg2={`${import.meta.env.VITE_BASE_IMAGE_URL}/delete.png`}
                procedureData={procedureData}
                procedureTotalPages={procedureTotalPages}
                setProcedureCurrentPage={setProcedureCurrentPage}
                procedureCurrentPage={procedureCurrentPage}
                setProcedureTotalPages={setProcedureTotalPages}
                handleDeleteItem={handleDeleteItem}
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default Inventory;
