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
    justifyContent: 'center',
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  qrCode: {
    width: 150,
    height: 150,
    marginBottom: 15,
  },
  infoContainer: {
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  branchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  heymozoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
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
  website // URL de la compañía/branch
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
            width: 150,
            margin: 0,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
          });
          setQrDataUrl(qrImage);
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      };
      generateQR();
    }, [table]);

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
        {qrBackgroundImage && (
          <>
            <Image style={styles.backgroundImage} src={qrBackgroundImage} />
            <View style={styles.overlay} />
          </>
        )}
        <View style={styles.contentContainer}>
          <Text style={[styles.tableName, { color: textColor, fontFamily }]}>
            {table.tableName}
          </Text>
          
          <Image style={styles.qrCode} src={qrDataUrl} />

          <View style={styles.infoContainer}>
            <View style={styles.branchInfoContainer}>
              {restaurantLogo && (
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