/** Resolves a fresh GPS fix; rejects with a user-safe Error carrying `userMessage`. */
export function getPosition() {
  return new Promise((resolve, reject) => {
    const fail = (userMessage) => reject(Object.assign(new Error(userMessage), { userMessage }));
    if (!navigator.geolocation) return fail("This device can't report its location.");
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => fail(e.code === 1 ? "Location access is blocked. Allow it in the browser settings." : "Couldn't get the device location."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}
