import { useState, useEffect } from "react";
import stl from "./Mint.module.css";
import { IoMdArrowRoundDown } from "react-icons/io";
import { MdCandlestickChart } from "react-icons/md";
import { FaExchangeAlt } from "react-icons/fa";
import { FaRegCopy } from "react-icons/fa";
import { ethers } from "ethers";
import { ERC20ABI } from "../../../utils/ERC20ABI";
import MessageOverlay from "../messageoverlay/MessageOverlay";
import { getTokenBalance } from "../../../utils/contractUtils";
import { formatInput } from "../../../utils/utils";

const Mint = ({
  pairA,
  pairB,
  setSelectingFarm,
  mintRatio,
  pool,
  contract,
  user,
  marketRatio,
  setUser,
  currentNetwork,
}) => {
  const [inputAmount, setInputAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [signer, setSigner] = useState(null);
  const [message, setMessage] = useState("");
  const [tokenABalance, setTokenABalance] = useState(0);
  const [tokenBBalance, setTokenBBalance] = useState(0);
  const [outputAmount, setOutputAmount] = useState("");

  // useEffect(() => {
  //   const newContract = new ethers.Contract(
  //     pool.trainerContract,
  //     masterABI,
  //     new ethers.JsonRpcProvider(currentNetwork.rpcUrl)
  //   );

  //   setContract(newContract);
  // }, [currentNetwork, pool]);

  useEffect(() => {
    const inputFormatted = inputAmount.replaceAll(",", "");
    setOutputAmount(inputFormatted);
  }, [inputAmount]);

  useEffect(() => {
    if (!user) return;

    const balanceFetcher = async () => {
      try {
        const tokenA = await getTokenBalance(
          pool.tokenA.address,
          user,
          currentNetwork.rpcUrl
        );
        setTokenABalance(tokenA);
      } catch (err) {
        setTokenABalance(0);
      }

      try {
        const tokenB = await getTokenBalance(
          pool.tokenB.address,
          user,
          currentNetwork.rpcUrl
        );
        setTokenBBalance(tokenB);
      } catch (err) {
        setTokenBBalance(0);
      }
    };
    balanceFetcher();
  }, [user, pool.tokenA.address, pool.tokenB.address]);

  useEffect(() => {
    const initializeProvider = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);
      }
    };
    initializeProvider();
  }, [user]);

  const handleCopyAddress = (name, address) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        alert(`${name}'s address copied.`);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleSwap = async () => {
    if (!inputAmount || +inputAmount > tokenABalance) {
      alert("Please enter correct values.");
      return;
    }

    try {
      setLoading(true);
      const contractWithSigner = contract.connect(signer);
      console.log("contractWithSigner" , contractWithSigner);

      const sanitizedAmount = inputAmount.replace(/,/g, "");
      const formattedAmount = ethers.parseUnits(sanitizedAmount.toString(), 18);

      const tokenAContract = new ethers.Contract(pool.tokenA.address, ERC20ABI, signer);
      console.log("tokenAContract:", tokenAContract);


      const hasApproved = localStorage.getItem(
        `MintApproved:${pool.trainerContract}`
      );
      if (!hasApproved) {
        const approveTx = await tokenAContract.approve(
          pool.tokenB,
          (BigInt(100_000_000_000) * BigInt(1e18)).toString()
        );
        await approveTx.wait();
        localStorage.setItem(`MintApproved:${pool.trainerContract}`, true);
      }

      const tx = await contractWithSigner.mint(formattedAmount);
      console.log("tx", tx);

      await tx.wait();

      setMessage(
        `Successfully Minted ${Number(
          inputAmount * mintRatio
        ).toLocaleString()} ${pairB.baseToken.symbol}!`
      );

      setTokenABalance((prev) => prev - +sanitizedAmount);
      setTokenBBalance((prev) => prev + +sanitizedAmount * mintRatio);
      setInputAmount("");
      setLoading(true);
      setTimeout(() => {
        setMessage("");
      }, 4500);
    } catch (err) {
      console.error("Minting failed:", err);
    } finally {
      setLoading(false); // End loading indicator
    }
  };

  // const connectWallet = async () => {
  //   if (window.ethereum) {
  //     try {
  //       // Request wallet connection
  //       const accounts = await window.ethereum.request({
  //         method: "eth_requestAccounts",
  //       });

  //       // Set the first account as the connected wallet
  //       setUser(accounts[0]);
  //     } catch (error) {
  //       console.error("Error connecting wallet:", error);
  //     }
  //   } else {
  //     alert("MetaMask is not installed. Please install MetaMask to connect.");
  //   }
  // };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request wallet connection
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        // Set the first account as the connected wallet
        setUser(accounts[0]);

        // Listen for account changes
        window.ethereum.on("accountsChanged", (newAccounts) => {
          if (newAccounts.length === 0) {
            // User disconnected wallet
            setUser(null);
            alert("Wallet disconnected.");
          } else {
            // Update user with new account
            setUser(newAccounts[0]);
          }
        });

        // Listen for chain changes (e.g., switching networks)
        window.ethereum.on("chainChanged", (chainId) => {
          console.log("Chain changed to:", chainId);
          // Optionally handle chain changes
          // You could reset state or reload the app here if needed
        });
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install MetaMask to connect.");
    }
  };

  const formattedPriceInput = +inputAmount.replaceAll(",", "");

  return (
    <div className={stl.innerModal}>
      {loading && (
        <div className={stl.loadOverlay}>
          <img
            src="Pika.gif"
            alt="Pika"
            className={`${stl.pika} ${Math.random() > 0.5 ? stl.rotate : ""}`}
          />
          <h2>Minting...</h2>
          <div className={stl.grassBg}></div>
        </div>
      )}
      {message && <MessageOverlay submittedMessage={message} />}
      <div className={stl.toprow}>
        <span className={stl.rate}>
          Mint: 1 {pool.tokenA.name} = {mintRatio}{" "}
          {pool.tokenB.name}
          {/* Mint: 1 {pairA?.baseToken?.symbol} = {mintRatio}{" "}
          {pairB?.baseToken?.symbol} */}
        </span>
        <span className={stl.rate}>
        9mm: 1 {pool.tokenA.name} = {marketRatio}{" "}
          {pool.tokenB.name}
          {/* 9mm: 1 {pairA?.baseToken?.symbol} = {marketRatio}{" "}
          {pairB?.baseToken?.symbol} */}
        </span>
      </div>
      <div className={stl.swapWrap}>
        {user && (
          <span className={stl.balanceSpan}>
            Balance:{" "}
            <span className={stl.whiteSpan}>
              {tokenABalance.toLocaleString()}
            </span>{" "}
            {pool.tokenA.name}
            {/* {pairA.baseToken.symbol} */}
          </span>
        )}
        <span>You're Freezing</span>
        <div className={stl.itemBox}>
          <div className={stl.itemWrap} onClick={() => setSelectingFarm(true)}>
            <img
              src={pool.dexTokenAImgUrl}
              alt="Main"
              className={stl.logoIcon}
            />
            <span>{pool.tokenA.name}</span>
            {/* <span>{pairA?.baseToken?.symbol}</span> */}
          </div>
          <div className={stl.numberBox}>
            <input
              type="text"
              placeholder="0"
              className={`${stl.amountInput} ${
                +inputAmount > tokenABalance && user ? stl.redInput : ""
              }`}
              value={inputAmount}
              onChange={(e) => {
                const inputValue = e.target.value.replace(/,/g, ""); // Remove existing commas
                if (!isNaN(inputValue) || inputValue === "") {
                  const formattedValue = formatInput(event.target.value);
                  setInputAmount(formattedValue);
                }
              }}
            />
          </div>
        </div>
        {inputAmount && +formattedPriceInput * +pairA.priceUsd > 0.01 && (
          <span className={stl.dollarValue}>
            $
            {(+formattedPriceInput * +pairA.priceUsd).toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }
            )}
          </span>
        )}
      </div>

      <IoMdArrowRoundDown className={stl.swapArrow} />
      <div className={stl.swapWrap}>
        {user && (
          <span className={stl.balanceSpan}>
            Balance:{" "}
            <span className={stl.whiteSpan}>
              {tokenBBalance.toLocaleString()}
            </span>{" "}
            {pairB.baseToken.symbol}
          </span>
        )}
        <span>You're Minting</span>
        <div className={stl.itemBox}>
          <div className={stl.itemWrap} onClick={() => setSelectingFarm(true)}>
            <img src={pool.dexTokenBImgUrl} alt="LP" className={stl.logoIcon} />
            <span>{pool.tokenB.name}</span>
            {/* <span>{pairB?.baseToken?.symbol}</span> */}
          </div>
          <div className={stl.numberBox}>
            <span
              className={`${stl.outputSpan} ${
                +outputAmount * mintRatio > 0 ? stl.whiteBalance : ""
              }`}
            >
              {outputAmount
                ? Math.floor(+outputAmount * mintRatio).toLocaleString()
                : "0"}
            </span>
          </div>
        </div>
      </div>

      <div className={stl.bottomBox}>
        <div className={stl.boxWrapper}>
          <div className={stl.tokenBox}>
            <div className={stl.wrapper}>
              <img
                src={pool.dexTokenAImgUrl}
                alt="Main"
                className={stl.logoIcon}
              />
              <span>{pool.tokenA.name}</span>
              {/* <span>{pairA?.baseToken?.symbol}</span> */}
            </div>
            <div className={stl.priceBox}>
              <span className={stl.priceSpan}>${pairA?.priceUsd}</span>
              <span
                className={`${stl.priceChange} ${
                  pairA?.priceChange?.h24 >= 0 ? "" : stl.redPrice
                }`}
              >
                24h {pairA?.priceChange?.h24 >= 0 ? "+" : ""}
                {pairA?.priceChange?.h24}%
              </span>
            </div>
            <div className={stl.ctaBox}>
              <button
                onClick={() =>
                  handleCopyAddress(pool.tokenA.name, pool.tokenA.address)
                  // handleCopyAddress(pairA?.baseToken?.symbol, pool.tokenA)
                }
              >
                <FaRegCopy className={stl.copyIcon} />
                Copy
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://dex.9mm.pro/swap?chain=pulsechain&inputCurrency=PLS&outputCurrency=${pool.tokenA.address}`,
                    "_blank"
                  )
                }
              >
                <FaExchangeAlt className={stl.buyIcon} />
                Buy
              </button>
              <button
                onClick={() =>
                  (window.location.href = `https://dexscreener.com/pulsechain/${pool.LP0}`)
                }
              >
                <MdCandlestickChart />
                Chart
              </button>
            </div>
          </div>
          <div className={stl.border}></div>
          <div className={stl.tokenBox}>
            <div className={stl.wrapper}>
              <img
                src="../Squirtlogo.webp"
                alt="Blast"
                className={stl.logoIcon}
              />
              <span>{pool.tokenB.name}</span>
              {/* <span>{pairB?.baseToken?.symbol}</span> */}
            </div>
            <div className={stl.priceBox}>
              <span className={stl.priceSpan}>${pairB?.priceUsd}</span>
              <span
                className={`${stl.priceChange} ${
                  pairB?.priceChange?.h24 >= 0 ? "" : stl.redPrice
                }`}
              >
                24h {pairB?.priceChange?.h24 >= 0 ? "+" : ""}
                {pairB?.priceChange?.h24}%
              </span>
            </div>
            <div className={stl.ctaBox}>
              <button
                onClick={() =>
                  handleCopyAddress(pool.tokenB.name, pool.tokenB.address)
                  // handleCopyAddress(pairB?.baseToken?.symbol, pool.tokenB)
                }
              >
                <FaRegCopy className={stl.copyIcon} />
                Copy
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://dex.9mm.pro/?chain=pulsechain&outputCurrency=${pool.tokenB.address}&inputCurrency=PLS`,
                    "_blank"
                  )
                }
              >
                <FaExchangeAlt className={stl.buyIcon} />
                Buy
              </button>
              <button
                onClick={() =>
                  (window.location.href = `https://dexscreener.com/pulsechain/${pool.LP1}`)
                }
              >
                <MdCandlestickChart />
                Chart
              </button>
            </div>
          </div>
        </div>
      </div>
      <button
        className={stl.swapCta}
        onClick={user ? handleSwap : connectWallet}
      >
        {!user && "Connect A Wallet"}
        {user && !loading && "Mint"}
        {user && loading && <img src="../Spinner.svg" alt="spinner" />}
      </button>
    </div>
  );
};

export default Mint;
