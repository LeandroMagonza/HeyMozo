## SpecStory

## Problemas con imágenes en React PDF (2/9/2025, 11:38:40 PM)

_**User**_

por que hay imagenes que podes meter como source en tu codigo y otras que no? como te das cuenta con la url

---

_**Assistant**_

Te ayudo a explicar la diferencia entre las URLs de imágenes que funcionan y las que no en React PDF.

En el código hay dos tipos de manejo de imágenes:

1. **URLs absolutas o estáticas** (funcionan directamente):
```javascript
src="/images/heymozo-logo.png"
```
Este tipo funciona porque es una ruta local/estática en tu proyecto.

2. **URLs dinámicas o externas** (pueden dar problemas):
```javascript
src={getDirectImageUrl(restaurantLogo)}
```

La razón principal de esta diferencia es que @react-pdf/renderer tiene limitaciones con las imágenes:

1. **Solo acepta estos formatos de imagen**:
   - Base64 encoded images
   - URLs locales/estáticas
   - Buffers
   - URLs que respondan con CORS habilitado

2. **Problemas comunes con URLs externas**:
   - Falta de headers CORS
   - Redirecciones
   - URLs temporales o que requieren autenticación

Por eso en el código se ve esta función:
```javascript
const getDirectImageUrl = (url) => {
  if (url.includes('instagram')) {
    return url.split('?')[0]; // Intenta limpiar parámetros de URL
  }
  return url;
}
```

Para solucionar estos problemas, algunas opciones son:

1. Convertir las imágenes externas a Base64 antes de usarlas
2. Usar un proxy CORS en tu backend
3. Pre-descargar las imágenes y guardarlas localmente
4. Usar un servicio de optimización de imágenes como Cloudinary

Un ejemplo de solución usando Base64 sería:

```javascript:src/components/QRCodeDocument.js
// ... existing code ...
const QRItem = ({ table }) => {
  const [qrDataUrl, setQrDataUrl] = React.useState('');
  const [logoBase64, setLogoBase64] = React.useState('');

  React.useEffect(() => {
    const convertImageToBase64 = async (imageUrl) => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error('Error converting image:', err);
        return null;
      }
    };

    const loadLogo = async () => {
      if (restaurantLogo) {
        const base64Logo = await convertImageToBase64(restaurantLogo);
        setLogoBase64(base64Logo);
      }
    };

    loadLogo();
  }, [restaurantLogo]);

  // ... resto del código del componente ...
  
  // Usar logoBase64 en vez de la URL directa
  {restaurantLogo && (
    <Image 
      style={styles.logo} 
      src={logoBase64 || restaurantLogo}
      cache={false}
    />
  )}
  // ... existing code ...
```

Esta solución convertirá las imágenes externas a Base64 antes de usarlas en el PDF, lo que debería resolver los problemas de compatibilidad.

---



---

