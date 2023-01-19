const form = document.getElementById("control-row");
const input = document.getElementById("input");
const message = document.getElementById("message");

(async function initPopupWindow() {
  input.focus();
})();

form.addEventListener("submit", handleFormSubmit);

async function handleFormSubmit(event) {
  event.preventDefault();
  clearMessage();
  if (input.value.length < 5) {
    setMessage("Must Have 5+ Characters!");
	return;
  }
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url.search("unrealengine.com/marketplace") < 0) {
    setMessage("Tab Not UE Marketplace!");
	return;
  }
  const bearer = await chrome.cookies.get({url:"https://www.unrealengine.com", name:"EPIC_BEARER_TOKEN"});
  if (!bearer) {
    setMessage("Not Logged In!");
	return;
  }
  const cookie = await chrome.cookies.get({url:"https://www.unrealengine.com/marketplace", name:"XSRF-TOKEN"});
  if (!cookie) {
    setMessage("Not Authorized!");
	return;
  }
  await chrome.scripting.executeScript({
    args: [cookie.value, input.value],
    target: {
      tabId: tab.id,
    },
    func: (arg1, arg2) => {
      var addReview = function(product, owner, token, content) {
        fetch("https://www.unrealengine.com/marketplace/api/review/" + product + "/reviews/add", {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-xsrf-token": token
          },
          body: JSON.stringify({ "rating": 5, "title": "Verification", "content": content, "targetOwner": owner })
        });
        /*fetch("https://www.unrealengine.com/marketplace/api/review/" + product + "/questions/add", {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-xsrf-token": token
          },
          body: JSON.stringify({ "title": "Verification", "content": content, "targetOwner": owner })
        });*/
      }
      const html = document.documentElement.outerHTML;
      const parts = html.split("\"productID\":\"");
      const product = parts.pop().split("\"").shift();
      var request = new XMLHttpRequest();
      request.open("GET", "https://www.unrealengine.com/marketplace/api/assets/asset/" + product, true);
      request.send(null);
      request.onreadystatechange = function() {
        if (request.readyState == 4)
          addReview(product, (request.responseText.split("\"owner\":\"")[1]).split("\"").shift(), arg1, arg2);
      };
    }
  });
  setMessage("Verified!");
}

function setMessage(str) {
  message.textContent = str;
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
}