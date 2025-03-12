import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import QRCode from 'qrcode';

// Definimos los estilos
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  qrContainer: {
    width: '48%',
    height: '48%',
    margin: '1%',
    padding: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#999999',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  contentContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    display: 'flex',
    flexDirection: 'column',
    paddingVertical: 5,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  qrCode: {
    width: 150,
    height: 150,
    objectFit: 'contain',
    alignSelf: 'center',
    margin: 0,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12, // Slightly increased padding for better spacing
    borderRadius: 8,
    // Shadow for better separation from background
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    // Add flexbox centering for perfect alignment
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10, // Reduced margin at the bottom to bring logos closer
    marginTop: 0, // No margin at the top
    alignSelf: 'center', // Center horizontally in parent
  },
  infoContainer: {
    width: '100%',
    marginTop: 5,
    paddingHorizontal: 10,
  },
  branchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
  },
  heymozoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 5,
  },
  logo: {
    width: 30,
    height: 30,
    objectFit: 'contain',
    marginRight: 5,
  },
  urlText: {
    fontSize: 10,
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  heymozoText: {
    fontSize: 10,
    color: '#666666',
    whiteSpace: 'nowrap',
  },
});

// Componente para generar el PDF
const QRCodeDocument = ({ 
  tables, 
  companyId, 
  branchId, 
  branchName, 
  restaurantLogo,
  textColor = "#000000",
  fontFamily = "Helvetica",
  qrBackgroundImage,
  website, // URL de la compañía/branch
  qrDarkColor = "#000000", // New parameter for QR dark color
  qrCodeSize = 180, // New parameter for QR size
  useWhiteBackground = true // New parameter for white background
}) => {
  // Función para generar la URL del QR
  const getTableUrl = (tableId) => {
    return `${window.location.origin}/user/${companyId}/${branchId}/${tableId}`;
  };

  // Función para dividir las mesas en grupos de 4
  const getTableGroups = () => {
    const groups = [];
    for (let i = 0; i < tables.length; i += 4) {
      groups.push(tables.slice(i, i + 4));
    }
    return groups;
  };

  // Componente para cada código QR individual
  const QRItem = ({ table }) => {
    const [qrDataUrl, setQrDataUrl] = React.useState('');

    React.useEffect(() => {
      const generateQR = async () => {
        try {
          const url = getTableUrl(table.id);
          const qrImage = await QRCode.toDataURL(url, {
            width: qrCodeSize, // Use custom size
            margin: 4, // Added margin for quiet zone (recommended by QR standard)
            color: {
              dark: qrDarkColor, // Use custom dark color
              light: '#FFFFFF'  // Pure white for maximum contrast
            },
            errorCorrectionLevel: 'H', // Keep high error correction
            // Optimize rendererOpts for better printing clarity
            rendererOpts: {
              quality: 1.0, // Highest quality
            }
          });
          setQrDataUrl(qrImage);
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      };
      generateQR();
    }, [table, qrDarkColor, qrCodeSize]);

    // Función para convertir URL de Instagram a URL de imagen directa
    const getDirectImageUrl = (url) => {
      // Si es una URL de Instagram, intentamos obtener la imagen directamente
      if (url.includes('instagram')) {
        // Podríamos necesitar usar un proxy o servicio intermedio
        // Por ahora, intentamos usar la URL directamente
        return url.split('?')[0]; // Removemos los parámetros de la URL
      }
      return url;
    };

    return (
      <View style={styles.qrContainer}>
        {qrBackgroundImage && qrBackgroundImage !== '' && (
          <>
            <Image style={styles.backgroundImage} src={qrBackgroundImage} />
            <View style={styles.overlay} />
          </>
        )}
        <View style={styles.contentContainer}>
          <View style={{ flex: 0.15 }}></View>
          
          <Text style={[styles.tableName, { color: textColor, fontFamily }]}>
            {table.tableName}
          </Text>
          
          <View style={[styles.qrCodeContainer, { 
            backgroundColor: useWhiteBackground ? '#FFFFFF' : 'transparent',
            padding: useWhiteBackground ? 10 : 0,
            boxShadow: useWhiteBackground ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'
          }]}>
            <Image 
              style={[styles.qrCode, { 
                width: qrCodeSize * 0.8, // Scale QR code for better fit
                height: qrCodeSize * 0.8,
                margin: 'auto', // Center the image within the container
                display: 'block' // Ensure block display for margin auto to work
              }]} 
              src={qrDataUrl} 
            />
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.branchInfoContainer}>
              {restaurantLogo && restaurantLogo !== '' && (
                <Image 
                  style={styles.logo} 
                  src={getDirectImageUrl(restaurantLogo)}
                  cache={false} // Deshabilitamos el caché
                />
              )}
              <Text style={[styles.urlText, { color: textColor, fontFamily }]}>
                {website}
              </Text>
            </View>

            <View style={styles.heymozoContainer}>
              <Image 
                style={styles.logo}
                src="/images/heymozo-logo.png"
              />
              <Text style={[styles.heymozoText, { color: textColor, fontFamily }]}>
                Generado por HeyMozo
              </Text>
            </View>
          </View>
          
          <View style={{ flex: 0.1 }}></View>
        </View>
      </View>
    );
  };

  return (
    <Document>
      {getTableGroups().map((group, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {group.map((table) => (
            <QRItem key={table.id} table={table} />
          ))}
          {[...Array(4 - group.length)].map((_, index) => (
            <View key={`empty-${index}`} style={styles.qrContainer} />
          ))}
        </Page>
      ))}
    </Document>
  );
};

export default QRCodeDocument; 