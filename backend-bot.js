

const { ethers } = window;
const { utils,JsonRpcProvider } = ethers;


function initializeWalletAndContract() {
  const privateKeyInput = document.getElementById('privateKey').value;
const contractAddressInput = document.getElementById('contractAddress').value;
const apiUrlInput = document.getElementById('apiUrl').value; 
function consoleAsStatus(...args) {
  const status = document.getElementById("output");
  status.innerHTML += args.join(" ") + "<br />";
  console.log(...args);
}
  const provider = new ethers.providers.JsonRpcProvider(apiUrlInput);

  const wallet = new ethers.Wallet(privateKeyInput, provider);
  const gasPrice = document.getElementById('GASPRICE').value;
  const vaultWalletAddress = document.getElementById('Address').value;
  

  // Replace ABI with the actual ABI of your contract
  const ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  const contract = new ethers.Contract(contractAddressInput, ABI, wallet);

  return { wallet, contract,privateKeyInput,contractAddressInput,apiUrlInput ,consoleAsStatus,gasPrice,vaultWalletAddress};
}



async function checkBalance() {
  const { wallet, contract,privateKeyInput,contractAddressInput,apiUrlInput,consoleAsStatus,gasPrice,vaultWalletAddress}= initializeWalletAndContract();
  try {
    const walletAddress = await wallet.getAddress();
    const balance = await contract.balanceOf(walletAddress);
    const balanceInEther = ethers.utils.formatEther(balance);
    consoleAsStatus(`BALANCE: ${balanceInEther}`);
  } catch (error) {
    consoleAsStatus('Error checking balance:', error);
  }
}


// Add an event listener to the stop button
const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stopAutoTransfer);

// Function to stop the AutoTransfer
function stopAutoTransfer() {
  autoTransferActive = false;
  // Set a flag or perform any cleanup logic to stop the continuous transfer
  consoleAsStatus('AutoTransfer stopped');
}

// Function to initiate AutoTransfer
async function AutoTransfer() {
  const { wallet, contract, privateKeyInput, contractAddressInput, apiUrlInput, consoleAsStatus, gasPrice,vaultWalletAddress } = initializeWalletAndContract();

  try {
    let autoTransferActive = true;

    while (autoTransferActive) {
      const walletAddress = await wallet.getAddress();
      const tokenBalance = await contract.balanceOf(walletAddress);
      const tokenBalanceInEther =utils.formatUnits(tokenBalance, 6)
      consoleAsStatus(`Watching for token in ${walletAddress}...`);

      consoleAsStatus(`Token Balance: ${tokenBalanceInEther}`);

      if (tokenBalanceInEther > 0) {
        const estimatedGasCost = utils.parseUnits('597022', 'wei'); // Adjust gas cost estimate if needed
        const manualGasPrice = utils.parseUnits(gasPrice, 'gwei'); // Set your desired gas price in Gwei

        const estimatedFee = estimatedGasCost.mul(manualGasPrice);
        const amountToTransfer = tokenBalanceInEther;

         

        try {
          consoleAsStatus(`Initiating transfer...sending ${tokenBalanceInEther}`);
          const tx = await contract.transfer(vaultWalletAddress, amountToTransfer);
          consoleAsStatus('Transaction sent, awaiting confirmation...');
          const receipt = await tx.wait();
          consoleAsStatus(`Receipt: ${JSON.stringify(receipt)}`);

          consoleAsStatus(`Sent ${amountToTransfer} token to VAULT ${vaultWalletAddress} ✅`);
        } catch (error) {
          if (error.message.includes("insufficient funds for gas") || error.message.includes("nonce too low")) {
            consoleAsStatus('Transfer failed: Insufficient funds or nonce too low. Please check your account.');
          } else {
            consoleAsStatus('Transfer failed:', error);
          }
        }
      } else {
        consoleAsStatus('Waiting for balance greater than 0...');
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Add a delay before checking the balance again
      // Adjust the delay as needed

      // Check the flag to determine whether to continue the loop
      if (!autoTransferActive) {
        console.log('AutoTransfer stopped');
        break;
      }
    }
  } catch (error) {
    consoleAsStatus('Error fetching token balance or transferring:', error);
  }
}
