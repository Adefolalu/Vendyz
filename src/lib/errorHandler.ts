/**
 * Comprehensive Error Handling Utilities
 *
 * This module provides centralized error handling for contract interactions,
 * translating technical errors into user-friendly messages with actionable guidance.
 */

interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
}

/**
 * Parse contract error and return user-friendly message
 */
export function parseContractError(error: any): ErrorMessage {
  const errorString = error?.message || error?.toString() || "";

  // Insufficient balance
  if (
    errorString.includes("insufficient funds") ||
    errorString.includes("InsufficientBalance")
  ) {
    return {
      title: "Insufficient Balance",
      message: "You don't have enough USDC to complete this transaction.",
      action: "Add more USDC to your wallet on Base network.",
    };
  }

  // User rejected transaction
  if (
    errorString.includes("user rejected") ||
    errorString.includes("User denied")
  ) {
    return {
      title: "Transaction Cancelled",
      message: "You cancelled the transaction in your wallet.",
      action: "Try again when you're ready to proceed.",
    };
  }

  // Insufficient allowance
  if (
    errorString.includes("insufficient allowance") ||
    errorString.includes("ERC20InsufficientAllowance")
  ) {
    return {
      title: "Approval Required",
      message: "You need to approve USDC spending first.",
      action: "Click the 'Approve USDC' button before purchasing.",
    };
  }

  // VendingMachine specific errors
  if (errorString.includes("InvalidTier")) {
    return {
      title: "Invalid Tier",
      message: "The selected tier is not available or inactive.",
      action: "Please select a different tier.",
    };
  }

  if (errorString.includes("TierNotActive")) {
    return {
      title: "Tier Inactive",
      message: "This tier is currently disabled.",
      action: "Please choose an active tier.",
    };
  }

  if (errorString.includes("InsufficientPayment")) {
    return {
      title: "Insufficient Payment",
      message: "The payment amount doesn't match the tier price.",
      action: "Make sure you have enough USDC for the selected tier.",
    };
  }

  // Raffle specific errors
  if (errorString.includes("RaffleNotActive")) {
    return {
      title: "Raffle Inactive",
      message: "This raffle is no longer active.",
      action: "Choose a different active raffle.",
    };
  }

  if (errorString.includes("RaffleEnded")) {
    return {
      title: "Raffle Ended",
      message: "This raffle has already ended.",
      action: "Check out other active raffles.",
    };
  }

  if (errorString.includes("MaxTicketsReached")) {
    return {
      title: "Max Tickets Reached",
      message: "You've already purchased the maximum allowed tickets (50).",
      action: "You cannot buy more tickets for this raffle.",
    };
  }

  if (errorString.includes("RaffleNotFinalized")) {
    return {
      title: "Cannot Finalize Yet",
      message: "Raffle doesn't meet finalization conditions.",
      action:
        "Wait for the raffle to end or fill up, and ensure minimum tickets are sold.",
    };
  }

  if (errorString.includes("MinTicketsNotMet")) {
    return {
      title: "Minimum Not Met",
      message: "Minimum ticket requirement hasn't been reached.",
      action: "More tickets need to be sold before finalization.",
    };
  }

  // Auction specific errors
  if (errorString.includes("AuctionEnded")) {
    return {
      title: "Auction Ended",
      message: "This auction has already closed.",
      action: "Wait for the next auction to start.",
    };
  }

  if (errorString.includes("BidTooLow")) {
    return {
      title: "Bid Too Low",
      message: "Your bid doesn't meet the minimum requirement of $100.",
      action: "Increase your bid to at least $100 USDC.",
    };
  }

  if (errorString.includes("IncrementTooSmall")) {
    return {
      title: "Insufficient Increment",
      message: "Bid increase must be at least $5.",
      action: "Increase your bid by a minimum of $5 USDC.",
    };
  }

  // Chainlink VRF errors
  if (errorString.includes("VRFTimeout")) {
    return {
      title: "VRF Timeout",
      message: "Chainlink VRF callback took too long (>1 hour).",
      action: "Contact admin for emergency fulfillment.",
    };
  }

  // Access control errors
  if (
    errorString.includes("OwnableUnauthorizedAccount") ||
    errorString.includes("Unauthorized")
  ) {
    return {
      title: "Unauthorized",
      message: "You don't have permission to perform this action.",
      action: "Only the contract owner can execute this function.",
    };
  }

  // Paused contract
  if (
    errorString.includes("EnforcedPause") ||
    errorString.includes("Pausable: paused")
  ) {
    return {
      title: "Contract Paused",
      message: "This contract is temporarily paused by the admin.",
      action: "Please wait for the contract to be unpaused.",
    };
  }

  // Gas errors
  if (
    errorString.includes("gas required exceeds allowance") ||
    errorString.includes("out of gas")
  ) {
    return {
      title: "Insufficient Gas",
      message: "You don't have enough ETH to pay for gas.",
      action: "Add more ETH to your wallet to cover transaction fees.",
    };
  }

  // Network errors
  if (errorString.includes("network") || errorString.includes("connection")) {
    return {
      title: "Network Error",
      message: "Unable to connect to the blockchain network.",
      action: "Check your internet connection and try again.",
    };
  }

  // Default error
  return {
    title: "Transaction Failed",
    message: errorString.slice(0, 100) || "An unexpected error occurred.",
    action: "Please try again or contact support if the issue persists.",
  };
}

/**
 * Validation helpers for client-side checks before transactions
 */

export function validatePurchase(
  selectedTier: number | null,
  isConnected: boolean,
  usdcBalance: bigint | undefined,
  tierPrice: bigint | undefined
): ErrorMessage | null {
  if (!isConnected) {
    return {
      title: "Wallet Not Connected",
      message: "Please connect your wallet to continue.",
      action: "Click the connect button in the header.",
    };
  }

  if (!selectedTier) {
    return {
      title: "No Tier Selected",
      message: "Please select a tier before purchasing.",
      action: "Choose a tier from the available options.",
    };
  }

  if (tierPrice && usdcBalance !== undefined && usdcBalance < tierPrice) {
    return {
      title: "Insufficient USDC",
      message: `You need at least $${Number(tierPrice) / 1e6} USDC.`,
      action: "Add more USDC to your wallet on Base network.",
    };
  }

  return null;
}

export function validateRafflePurchase(
  raffleId: bigint | null,
  ticketAmount: string,
  isConnected: boolean,
  usdcBalance: bigint | undefined,
  totalCost: bigint | undefined
): ErrorMessage | null {
  if (!isConnected) {
    return {
      title: "Wallet Not Connected",
      message: "Please connect your wallet to continue.",
      action: "Click the connect button in the header.",
    };
  }

  if (!raffleId) {
    return {
      title: "No Raffle Selected",
      message: "Please select a raffle first.",
      action: "Click 'Buy Tickets' on a raffle card.",
    };
  }

  const amount = parseInt(ticketAmount);
  if (isNaN(amount) || amount < 1) {
    return {
      title: "Invalid Amount",
      message: "Please enter a valid number of tickets (minimum 1).",
      action: "Enter a number between 1 and 50.",
    };
  }

  if (amount > 50) {
    return {
      title: "Too Many Tickets",
      message: "Maximum 50 tickets per user per raffle.",
      action: "Reduce the number of tickets.",
    };
  }

  if (totalCost && usdcBalance !== undefined && usdcBalance < totalCost) {
    return {
      title: "Insufficient USDC",
      message: `You need at least $${Number(totalCost) / 1e6} USDC.`,
      action: "Add more USDC to your wallet.",
    };
  }

  return null;
}

export function validateAuctionBid(
  tokenAddress: string,
  bidAmount: string,
  isConnected: boolean,
  usdcBalance: bigint | undefined,
  currentBid: bigint | undefined
): ErrorMessage | null {
  if (!isConnected) {
    return {
      title: "Wallet Not Connected",
      message: "Please connect your wallet to continue.",
      action: "Click the connect button in the header.",
    };
  }

  if (
    !tokenAddress ||
    !tokenAddress.startsWith("0x") ||
    tokenAddress.length !== 42
  ) {
    return {
      title: "Invalid Token Address",
      message: "Please enter a valid Base token contract address.",
      action: "Format: 0x followed by 40 hexadecimal characters.",
    };
  }

  const amount = parseFloat(bidAmount);
  if (isNaN(amount) || amount < 100) {
    return {
      title: "Bid Too Low",
      message: "Minimum bid is $100 USDC.",
      action: "Enter at least $100.",
    };
  }

  if (amount % 5 !== 0) {
    return {
      title: "Invalid Increment",
      message: "Bid must be in $5 increments.",
      action: "Round to nearest $5 (e.g., $100, $105, $110).",
    };
  }

  const bidBigInt = BigInt(Math.floor(amount * 1e6));

  if (currentBid && bidBigInt <= currentBid) {
    return {
      title: "Bid Not High Enough",
      message: `Your bid must be at least $5 higher than your current bid of $${Number(currentBid) / 1e6}.`,
      action: "Increase your bid amount.",
    };
  }

  if (usdcBalance !== undefined && usdcBalance < bidBigInt) {
    return {
      title: "Insufficient USDC",
      message: `You need at least $${amount} USDC.`,
      action: "Add more USDC to your wallet.",
    };
  }

  return null;
}

export function validateRaffleCreation(
  tokenAddress: string,
  ticketPrice: string,
  maxTickets: string,
  minTickets: string,
  duration: string,
  isConnected: boolean
): ErrorMessage | null {
  if (!isConnected) {
    return {
      title: "Wallet Not Connected",
      message: "Please connect your wallet to continue.",
      action: "Click the connect button in the header.",
    };
  }

  if (
    !tokenAddress ||
    !tokenAddress.startsWith("0x") ||
    tokenAddress.length !== 42
  ) {
    return {
      title: "Invalid Token Address",
      message: "Please enter a valid Base token contract address.",
      action: "Format: 0x followed by 40 hexadecimal characters.",
    };
  }

  const price = parseFloat(ticketPrice);
  if (isNaN(price) || price <= 0) {
    return {
      title: "Invalid Ticket Price",
      message: "Ticket price must be greater than 0.",
      action: "Enter a valid price in USDC.",
    };
  }

  const max = parseInt(maxTickets);
  const min = parseInt(minTickets);

  if (isNaN(max) || max < 2) {
    return {
      title: "Invalid Max Tickets",
      message: "Max tickets must be at least 2.",
      action: "Enter a valid number.",
    };
  }

  if (isNaN(min) || min < 2) {
    return {
      title: "Invalid Min Tickets",
      message: "Min tickets must be at least 2.",
      action: "Enter a valid number.",
    };
  }

  if (min > max) {
    return {
      title: "Invalid Ticket Range",
      message: "Minimum tickets cannot exceed maximum tickets.",
      action: "Adjust your min/max values.",
    };
  }

  const days = parseInt(duration);
  if (isNaN(days) || days < 1) {
    return {
      title: "Invalid Duration",
      message: "Duration must be at least 1 day.",
      action: "Enter a valid number of days.",
    };
  }

  if (days > 365) {
    return {
      title: "Duration Too Long",
      message: "Maximum duration is 365 days.",
      action: "Enter a shorter duration.",
    };
  }

  return null;
}
