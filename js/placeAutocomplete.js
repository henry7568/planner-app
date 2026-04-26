export async function loadGoogleMapsPlacesLibrary(apiKey) {
  if (window.google?.maps?.places?.PlaceAutocompleteElement) {
    return true;
  }

  if (!apiKey || apiKey === "여기에_구글맵_API_KEY") {
    console.warn("Google Maps API 키가 설정되지 않았습니다.");
    return false;
  }

  if (!document.getElementById("googleMapsScript")) {
    const script = document.createElement("script");
    script.id = "googleMapsScript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  if (window.google?.maps?.importLibrary) {
    await google.maps.importLibrary("places");
  }

  return !!window.google?.maps?.places?.PlaceAutocompleteElement;
}

export function createPlaceAutocompleteWidget({
  mode,
  mountEl,
  placeholder = "장소 검색",
  onPlaceSelected,
}) {
  if (!mountEl || !window.google?.maps?.places?.PlaceAutocompleteElement) {
    return;
  }

  mountEl.innerHTML = "";

  const autocompleteEl = new google.maps.places.PlaceAutocompleteElement({
    placeholder,
  });

  mountEl.appendChild(autocompleteEl);

  autocompleteEl.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  autocompleteEl.addEventListener("gmp-select", async (event) => {
    event.stopPropagation();

    const placePrediction = event.placePrediction;
    if (!placePrediction) return;

    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "id"],
    });

    onPlaceSelected?.({
      mode,
      selectedPlace: {
        label: place.displayName || "",
        address: place.formattedAddress || "",
        placeId: place.id || "",
      },
    });
  });
}
