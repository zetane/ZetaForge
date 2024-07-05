import qrcode

def compute(url):
    """Generate a QR code from an URL.
    """

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Create an image from the QR Code instance
    img = qr.make_image(fill='black', back_color='white')

    # Saving the image
    img.save('qr_code.png')

    return {"qr_code_path": 'qr_code.png'}


def test():
    """Test the compute function."""

    print("Running test")
