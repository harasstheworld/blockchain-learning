import * as React from "react";
import Stack from "@mui/material/Stack";
import Fab from "@mui/material/Fab";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import Snackbar from "@mui/material/Snackbar";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Divider,
  FormControl,
  Grow,
  IconButton,
  Skeleton,
  InputLabel,
  CardActions,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { StoreContext } from "../store";
import Web3 from "web3";
import { OwnerManagerFactory } from "../contracts/OwnerManagerFactory";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Switch from "@mui/material/Switch";
import LoadingButton from "@mui/lab/LoadingButton";
import PublishIcon from "@mui/icons-material/Publish";
import NavigationIcon from "@mui/icons-material/Navigation";
import GppMaybeIcon from "@mui/icons-material/GppMaybe";
import PreviewIcon from "@mui/icons-material/Preview";
import PageviewIcon from "@mui/icons-material/Pageview";
import ClearIcon from "@mui/icons-material/Clear";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import SyncIcon from "@mui/icons-material/Sync";
import { useRouter } from "next/router";

import {
  MESSAGE_SIGN,
  OM_FACTORY_ADDRESS,
  LP_ADDRESS_PROVIDER,
} from "../utils/constant";
import { addStorage } from "../utils/localStorage";
import { LendingPoolAddressesProvider } from "../contracts/LendingPoolAddressProvider";
import { LendingPool } from "../contracts/LendingPool";

// const mapping = {
//   "0x01": "Mainnet",
//   "0x03": "Ropsten",
//   "0x04": "Rinkeby",
//   "0x05": "Goerli",
//   "0x2a": "Kovan",
//   "0x38": "BSC",
// };

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");
const initContract = (addr: string) =>
  new web3.eth.Contract(OwnerManagerFactory as any[], addr);

// export default function Import(props: {
//   item: {
//     name: string;
//     address: string;
//   }[];
// }) {
export default function Import(props: { handleChangeTab }) {
  const router = useRouter();

  const ownerManagerFactoryContract = new web3.eth.Contract(
    OwnerManagerFactory as any[],
    OM_FACTORY_ADDRESS
  );

  const { accountContext, addressContext, signatureContext } =
    React.useContext(StoreContext);

  const [accounts, setAccounts] = accountContext;
  const [address, setAddress] = addressContext;
  const [signature, setSignature] = signatureContext;
  const [isVerified, setIsVerified] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const [openAlert, setOpenAlert] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingVerify, setLoadingVerify] = React.useState(false);
  const [nameIdentify, setNameIdentify] = React.useState("");
  const [isExist, setIsExist] = React.useState(false);
  const [openAddressList, setOpenAddressList] = React.useState(false);

  const [require, setRequire] = React.useState("0");

  const handleChange = (event: SelectChangeEvent) => {
    setRequire(event.target.value as string);
    console.log(event.target.value);
  };

  const handleCheck = async () => {
    const result = await axios.get(
      `http://${window.location.hostname}:4000/wallets/check/${nameIdentify}`
    );

    setIsExist(result.data);
    setOpenAddressList(!result.data);

    if (!result.data) {
      const walletInstance = await axios.get(
        `http://${window.location.hostname}:4000/wallets/${nameIdentify}`
      );
      if (walletInstance.data !== "00000000-0000-0000-0000-000000000000") {
        const addressInstance = await axios.get(
          `http://${window.location.hostname}:4000/addresses/wallet/${walletInstance.data}`
        );
        console.log(addressInstance);
        setAddress(
          addressInstance.data.map((item, index) => ({
            account: item.address,
            status: 1,
            index: index,
          }))
        );

        setSignature(addressInstance.data.map((item) => item.signature));
        setRequire(addressInstance.data.length.toString());
      } else {
        if (address.every((element) => element.account != accounts[0])) {
          setAddress([
            ...address,
            {
              account: accounts[0],
              status: 0,
              index: address.length,
            },
          ]);
        }
      }
    }
  };

  React.useEffect(() => {
    const listener = async (event) => {
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        await handleCheck();
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, []);

  React.useEffect(() => {
    const check =
      address.length != 0 &&
      address.filter((item) => item.status == 1).length == address.length;
    // if (check) {
    //   axios.get("https://randomuser.me/api/").then((response) => {
    //     let nameResponse = response.data.results[0].name;
    //     setNameIdentify(nameResponse.last + " " + nameResponse.first);
    //   });
    // }
    setIsConfirmed(check);
  }, [address, signature]);

  const handleConfirm = async () => {
    const messageSign = [MESSAGE_SIGN, nameIdentify].join("\n\n");
    const sign = await window.ethereum.request({
      method: "personal_sign",
      params: [messageSign, accounts[0]],
    });

    address.forEach((item, index) => {
      if (item.account == accounts[0]) {
        signature[index] = sign;
        setSignature([...signature]);
        address[index].status = 1;
        setAddress([...address]);
      }
    });

    setRequire(address.length.toString());

    let addressPost = address
      .filter((item) => item.status == 1)
      .map((item) => item.account);
    let signaturePost = signature.filter((item) => item != undefined);
    console.log(addressPost);
    console.log(signaturePost);

    const result = await axios.get(
      `http://${window.location.hostname}:4000/wallets/${nameIdentify}`
    );

    if (result.data === "00000000-0000-0000-0000-000000000000") {
      let id = uuidv4();
      await axios.post(`http://${window.location.hostname}:4000/wallets`, {
        id: id,
        title: nameIdentify,
      });
      for (let i = 0; i < addressPost.length; i++) {
        await axios.post(
          `http://${window.location.hostname}:4000/addresses/wallet`,
          {
            id: uuidv4(),
            address: addressPost[i],
            signature: signaturePost[i],
            walletId: id,
          }
        );
      }
    } else {
      let id = result.data;
      console.log(id);
      for (let i = 0; i < addressPost.length; i++) {
        await axios.post(
          `http://${window.location.hostname}:4000/addresses/wallet`,
          {
            id: uuidv4(),
            address: addressPost[i],
            signature: signaturePost[i],
            walletId: id,
          }
        );
      }
    }
  };

  const handleTransaction = async () => {
    setLoading(true);
    const result = await axios.get(
      `http://${window.location.hostname}:4000/wallets/${nameIdentify}`
    );
    const addressList = address.map((item) => item.account);

    const messageSign = [MESSAGE_SIGN, nameIdentify].join("\n\n");

    ownerManagerFactoryContract.methods
      .create(messageSign, addressList, signature, require)
      .send({ from: accounts[0] })
      .on("error", (error, receipt) => {
        setOpenAlert(true);
        setIsVerified(false);
        setLoading(false);
      })
      .on("receipt", async (receipt) => {
        console.log(receipt);
        console.log(
          receipt.events.ContractInstantiation.returnValues.instantiation
        );

        await axios.patch(`http://${window.location.hostname}:4000/wallets`, {
          id: result.data,
          title: nameIdentify,
          address:
            receipt.events.ContractInstantiation.returnValues.instantiation,
          isIdentified: true,
        });

        addStorage(
          {
            address:
              receipt.events.ContractInstantiation.returnValues.instantiation,
            type: "Contract Accounts",
          },
          "addressBook"
        );
        setOpenAlert(true);
        setIsVerified(true);
        setLoading(false);
      });
  };

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    setOpenAlert(false);
  };

  const clearAccount = (_address: string) => {
    address.forEach((item, index) => {
      if (item.account == _address) {
        console.log(index);
        let key = index;
        setAddress(address.filter((item, index) => index != key));
        setSignature(signature.filter((item, index) => index != key));
        setRequire((address.length - 1).toString());
      }
    });
  };

  return (
    <div style={{ display: "flex", columnGap: 20, marginTop: 25 }}>
      <Card
        sx={{
          maxWidth: 345,
          border: "1px solid rgba(0, 0, 0, 0.25)",
          borderRadius: 1,
          // boxShadow: "1px 1px",
        }}
      >
        <CardMedia
          component="img"
          height="auto"
          image="/blockchain_industry.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Create Group Address
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new group address that is controlled by one or multiple
            owners. You will be required to pay a network fee for creating your
            new group address.
          </Typography>
        </CardContent>
        {/* <CardActions>
          <Button size="small">Share</Button>
          <Button size="small">Learn More</Button>
        </CardActions> */}
      </Card>
      <Box
        sx={{
          width: "auto",
          height: "auto",
          border: "1px solid rgba(0, 0, 0, 0.25)",
          borderRadius: 1,
          padding: 4,
          paddingTop: 3,
          // boxShadow: "1px 1px",
          // "&:hover": {
          //   backgroundColor: "primary.main",
          //   opacity: [0.9, 0.8, 0.7],
          // },
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          // divider={<Divider orientation="vertical" flexItem />}
        >
          <TextField
            id="outlined-read-only-input"
            label="Name Group Address"
            error={isExist}
            // helperText="Incorrect entry."
            // value={nameIdentify}
            sx={{ mt: 2, mb: 3, width: "50ch", height: 50 }}
            // InputProps={{
            //   readOnly: true,
            // }}
            onChange={(event) => {
              setNameIdentify(event.target.value);
              setIsExist(false);
              setOpenAddressList(false);
              setAddress([]);
              setSignature([]);
            }}
          />

          <LoadingButton
            sx={{ mt: 2, mb: 3, height: 56 }}
            // size="small"
            onClick={handleCheck}
            loading={loading}
            loadingIndicator="Loading"
            variant="outlined"
          >
            Create
          </LoadingButton>
        </Stack>
        {!openAddressList && (
          <Stack>
            <Button
              variant="outlined"
              // color="secondary"
              onClick={(event) => {
                // router.push("/");
                props.handleChangeTab(event, 2);
              }}
            >
              Already have a group address, go to manage
            </Button>
          </Stack>
        )}
        {openAddressList && (
          <Stack>
            <Stack direction="row" spacing={3} justifyContent={"flex-start"}>
              <Stack direction="column">
                <Typography
                  variant="body1"
                  my={0.5}
                  style={{ fontWeight: 600 }}
                  sx={{ color: "#673ab7" }}
                >
                  ADDRESS
                </Typography>
                {address.map((item, index) => {
                  return (
                    <Typography
                      key={index}
                      variant="body1"
                      my={1}
                      style={{ fontWeight: 600 }}
                    >
                      {item.account}
                    </Typography>
                  );
                })}

                {/* {props.item.map((it, index) => (
            <Typography
              key={index}
              variant="body1"
              my={1}
              style={{ fontWeight: 600 }}
            >
              {"0x" + it.address.substring(0)}
            </Typography>
          ))} */}
              </Stack>
              <Stack direction="column">
                <Typography
                  variant="body1"
                  my={0.5}
                  style={{ fontWeight: 600 }}
                  sx={{ color: "#673ab7" }}
                >
                  DETAIL
                </Typography>
                {address.map((item, index) => (
                  <IconButton
                    onClick={() =>
                      window.open(
                        `https://kovan.etherscan.io/address/${item.account}`
                      )
                    }
                    key={index}
                    size="medium"
                    color="primary"
                    component="span"
                  >
                    <PageviewIcon />
                  </IconButton>
                ))}
              </Stack>
              <Stack direction="column">
                <Typography
                  variant="body1"
                  my={0.5}
                  style={{ fontWeight: 600 }}
                  sx={{ color: "#673ab7" }}
                >
                  SIGNED
                </Typography>
                {address.map((item, index) => {
                  return (
                    <Typography
                      key={index}
                      variant="body1"
                      my={1}
                      style={{ fontWeight: 600 }}
                    >
                      {item.status ? "True" : "False"}
                    </Typography>
                  );
                })}
              </Stack>
              <Stack direction="column">
                <Typography
                  variant="body1"
                  my={0.5}
                  style={{ fontWeight: 600 }}
                  sx={{ color: "#673ab7" }}
                >
                  CLEAR
                </Typography>
                {address.map((item, index) => (
                  <IconButton
                    onClick={() => clearAccount(item.account)}
                    key={index}
                    size="medium"
                    color="primary"
                    component="span"
                  >
                    <ClearIcon />
                  </IconButton>
                ))}
              </Stack>
            </Stack>
            <Box sx={{ "& > :not(style)": { my: 1, mr: 2 } }}>
              <Divider />
              <LoadingButton
                sx={{ height: 55 }}
                variant="contained"
                startIcon={<DoneAllIcon />}
                onClick={handleConfirm}
                loading={loadingVerify}
                loadingPosition="start"
                disabled={
                  !address.some((item) => {
                    return item.account == accounts[0] && item.status == 0;
                  })
                }
              >
                Confirm {address.filter((item) => item.status == 1).length} /{" "}
                {address.length}
              </LoadingButton>
              <FormControl sx={{ height: 55, width: 120 }}>
                <InputLabel id="demo-simple-select-label">Requires</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={require}
                  label="Requires"
                  disabled={require == "0"}
                  onChange={handleChange}
                >
                  <MenuItem key="0" value="0" disabled>
                    N/A
                  </MenuItem>
                  {address
                    .filter((item) => item.status == 1)
                    .map((element, index) => {
                      return (
                        <MenuItem key={index + 1} value={index + 1}>
                          {index + 1}
                        </MenuItem>
                      );
                    })}
                  {/* <MenuItem value={10}>Ten</MenuItem>
                <MenuItem value={20}>Twenty</MenuItem>
                <MenuItem value={30}>Thirty</MenuItem> */}
                </Select>
              </FormControl>
              <Grow in={isConfirmed}>
                <LoadingButton
                  sx={{ height: 55 }}
                  onClick={handleTransaction}
                  startIcon={<PublishIcon />}
                  loading={loading}
                  loadingPosition="start"
                  variant="contained"
                >
                  Send Transaction
                </LoadingButton>
              </Grow>
            </Box>
          </Stack>
        )}
        {/* <Grow in={isConfirmed}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent={"flex-start"}
          alignItems="center"
          sx={{ mt: 1 }}
        >
          <Stack direction="column">
            <TextField
              id="outlined-read-only-input"
              label="Name"
              value={nameIdentify}
              sx={{ my: 1, width: "50ch" }}
              InputProps={{
                readOnly: true,
              }}
            />
          </Stack>
          <Stack direction="column">
            <TextField
              onChange={handleCombineId}
              id="outlined-number"
              label="Key"
              type="number"
              sx={{ my: 1, width: "10ch" }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Stack>
          <Stack direction="column">
            <LoadingButton
              onClick={handleTransaction}
              startIcon={<PublishIcon />}
              loading={loading}
              loadingPosition="start"
              variant="contained"
              color="secondary"
              sx={{ my: 1, height: 52 }}
            >
              Send
            </LoadingButton>
          </Stack>
        </Stack>
            </Grow> */}
      </Box>

      <Snackbar
        open={openAlert && isVerified}
        autoHideDuration={3000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="success" sx={{ width: "100%" }}>
          Success!
        </Alert>
      </Snackbar>
      <Snackbar
        open={openAlert && !isVerified}
        autoHideDuration={3000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="error" sx={{ width: "100%" }}>
          Failed!
        </Alert>
      </Snackbar>
    </div>
  );
}
