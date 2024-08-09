# Python block template


def compute(img_path):
    '''Data Augmentation block for Computer Vision

    Inputs:
    img_path (str): image path
    
     
    Outputs:
    augmented_img_path (all): result images path
    
    '''

    import albumentations as A
    import cv2
   
    def rotate(input_image_numpy, parameter=10):
        test_name = "rotate"
        description = 'https://albumentations.ai/docs/api_reference/augmentations/geometric/rotate/#albumentations.augmentations.geometric.rotate.Rotate'
        parameter = int(round(parameter))
        transform = A.Compose([A.Rotate(limit=[parameter, parameter], interpolation=1, border_mode=0, value=0, mask_value=None, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def translate_horizontal(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[0, 0], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[parameter, parameter], shift_limit_y=None, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def translate_vertical(input_image_numpy, parameter=1):
        test_name = "translate_vertical"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[0, 0], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=None, shift_limit_y=[parameter, parameter], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def translate_horizontal_reflect(input_image_numpy, parameter=1):
        test_name = "translate_horizontal_reflect"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[0, 0], rotate_limit=[0, 0], interpolation=1, border_mode=4, value=None, mask_value=None, shift_limit_x=[parameter, parameter], shift_limit_y=None, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def translate_vertical_reflect(input_image_numpy, parameter=1):
        test_name = "translate_vertical_reflect"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate (shift_limit=[0, 0], scale_limit=[0, 0], rotate_limit=[0, 0], interpolation=1, border_mode=4, value=None, mask_value=None, shift_limit_x=None, shift_limit_y=[parameter, parameter], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_center(input_image_numpy, parameter=0.2):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=None, shift_limit_y=None, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_right(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[-parameter/2.0, -parameter/2.0], shift_limit_y=None, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_left(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[parameter/2.0, parameter/2.0], shift_limit_y=None, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_top(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=None, shift_limit_y=[parameter/2.0, parameter/2.0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_bottom(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=None, shift_limit_y=[-parameter/2.0, -parameter/2.0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_right_bottom(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[-parameter/2.0, -parameter/2.0], shift_limit_y=[-parameter/2.0, -parameter/2.0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_right_top(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[-parameter/2.0, -parameter/2.0], shift_limit_y=[parameter/2.0, parameter/2.0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_left_bottom(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[parameter/2.0, parameter/2.0], shift_limit_y=[-parameter/2.0, -parameter/2.0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def zoom_left_top(input_image_numpy, parameter=1):
        test_name = "translate_horizontal"
        description = ''
        transform = A.Compose([A.ShiftScaleRotate(shift_limit=[0, 0], scale_limit=[parameter, parameter], rotate_limit=[0, 0], interpolation=1, border_mode=0, value=0, mask_value=None, shift_limit_x=[parameter/2.0, parameter/2.0], shift_limit_y=[parameter/2.0, parameter/2.0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def blur(input_image_numpy, parameter=45):
        test_name = "blur"
        description = 'https://albumentations.ai/docs/api_reference/augmentations/transforms/#albumentations.augmentations.transforms.Blur'
        if parameter < 3:
            parameter = 3
        transform = A.Compose([A.Blur([parameter, parameter], p=1)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def random_shadow(input_image_numpy, parameter=1):
        test_name = "random_shadow"
        description = ''
        if parameter < 0:
            parameter = 0
        if parameter > 1:
            parameter = 1
        transform = A.Compose([A.RandomShadow(shadow_roi=(0.5-(parameter/2), 0.5-(parameter/2), 0.5+(parameter/2), 0.5+(parameter/2)), num_shadows_lower=1, num_shadows_upper=2, shadow_dimension=5, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def sharpen_and_darken(input_image_numpy, parameter=1):
        test_name = "sharpen_and_darken"
        description = ''
        transform = A.Compose([A.Sharpen(alpha=[0.5, 0.5], lightness=[parameter, parameter], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def random_grid_shuffle(input_image_numpy, parameter=5):
        test_name = "random_grid_shuffle"
        description = ''
        if parameter < 0:
            parameter = 1
        transform = A.Compose([A.RandomGridShuffle(grid=[int(round(parameter)), int(round(parameter))], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def gaussian_noise(input_image_numpy, parameter=250):
        test_name = "gaussian_noise"
        description = ''
        transform = A.Compose([A.GaussNoise(var_limit=[int(round(parameter)), int(round(parameter))], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def round_to_odd(x: float) -> int:
        """Rounds a float number to the closest odd integer."""
        rounded = round(x)
        if rounded % 2 == 0:
            return rounded - 1 if x - rounded < 0 else rounded + 1
        else:
            return rounded

    def motion_blur(input_image_numpy, parameter=10):
        test_name = "motion_blur"
        description = ''
        if parameter < 3:
            parameter = 3
        parameter = round_to_odd(parameter)
        transform = A.Compose([A.MotionBlur(blur_limit=[int(round(parameter)), int(round(parameter))], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def horizontal_flip(input_image_numpy, parameter=1):
        test_name = "horizontal_flip"
        description = ''
        parameter = 1
        transform = A.Compose([A.HorizontalFlip(always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def vertical_flip(input_image_numpy, parameter=1):
        test_name = "vertical_flip"
        description = ''
        parameter = 1
        transform = A.Compose([A.VerticalFlip(always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def horizontal_vertical_flip(input_image_numpy, parameter=1):
        test_name = "vertical_flip"
        description = ''
        parameter = 1
        transform = A.Compose([
            A.HorizontalFlip(always_apply=True),
            A.VerticalFlip(always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def sun_flare(input_image_numpy, parameter=75):
        test_name = "sun_flare"
        description = ''
        if parameter < 3:
            parameter = 3
        transform = A.Compose([A.RandomSunFlare(flare_roi=(0, 0, 1, 1), angle_lower=0,
                                angle_upper=1, num_flare_circles_lower=6, num_flare_circles_upper=7, src_radius=1+int(round(parameter)),
                                src_color=(255, 255, 255), always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def contrast_raise(input_image_numpy, parameter=1):
        test_name = "contrast_raise"
        description = ''
        transform = A.Compose(
            [A.RandomBrightnessContrast(brightness_limit=[0, 0], contrast_limit=[parameter, parameter], brightness_by_max=True, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def brightness_raise(input_image_numpy, parameter=0.5):
        test_name = "brightness_raise"
        description = ''
        transform = A.Compose(
            [A.RandomBrightnessContrast(brightness_limit=[parameter, parameter], contrast_limit=[0, 0], brightness_by_max=True, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def brightness_reduce(input_image_numpy, parameter=0.5):
        test_name = "brightness_reduce"
        description = ''
        transform = A.Compose(
            [A.RandomBrightnessContrast(brightness_limit=[-parameter, -parameter], contrast_limit=[0, 0], brightness_by_max=True, always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}


    def red_shift(input_image_numpy, parameter=45):
        test_name = "red_shift"
        description = 'https://albumentations.ai/docs/api_reference/augmentations/transforms/#albumentations.augmentations.transforms.RGBShift'
        parameter = int(round(parameter))
        transform = A.Compose([A.RGBShift(r_shift_limit=[parameter, parameter], g_shift_limit=[0, 0],
                                        b_shift_limit=[0, 0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def green_shift(input_image_numpy, parameter=45):
        test_name = "green_shift"
        description = ''
        parameter = int(round(parameter))
        transform = A.Compose([A.RGBShift(r_shift_limit=[0, 0], g_shift_limit=[parameter, parameter],
                                        b_shift_limit=[0, 0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def blue_shift(input_image_numpy, parameter=45):
        test_name = "blue_shift"
        description = ''
        parameter = int(round(parameter))
        transform = A.Compose([A.RGBShift(r_shift_limit=[0, 0], g_shift_limit=[0, 0],
                                        b_shift_limit=[parameter, parameter], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def yellow_shift(input_image_numpy, parameter=45):
        test_name = "yellow_shift"
        description = ''
        parameter = int(round(parameter))
        transform = A.Compose([A.RGBShift(r_shift_limit=[parameter, parameter], g_shift_limit=[parameter, parameter],
                                        b_shift_limit=[0, 0], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def magenta_shift(input_image_numpy, parameter=45):
        test_name = "magenta_shift"
        description = ''
        parameter = int(round(parameter))
        transform = A.Compose([A.RGBShift(r_shift_limit=[parameter, parameter], g_shift_limit=[0, 0],
                                        b_shift_limit=[parameter, parameter], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}

    def cyan_shift(input_image_numpy, parameter=45):
        test_name = "cyan_shift"
        description = ''
        parameter = int(round(parameter))
        transform = A.Compose([A.RGBShift(r_shift_limit=[0, 0], g_shift_limit=[parameter, parameter],
                                        b_shift_limit=[parameter, parameter], always_apply=True)])
        transformed = transform(image=input_image_numpy)
        transformed_image = transformed["image"]
        return {'test_name': test_name, 'parameters': parameter, 'image': transformed_image, 'description': description}
    
    out1 = []
    #Your code
    img = cv2.imread(img_path, cv2.COLOR_BGR2RGB)
    functions = ["cyan_shift", "magenta_shift", "yellow_shift", "blue_shift", "green_shift", "red_shift", "brightness_reduce", "brightness_raise",
                 "contrast_raise", "sun_flare", "horizontal_vertical_flip", "vertical_flip", "horizontal_flip", "motion_blur", "gaussian_noise",
                 "random_grid_shuffle", "sharpen_and_darken", "random_shadow", "blur", "zoom_left_top", "zoom_left_bottom", "zoom_right_top", 
                 "zoom_right_bottom", "zoom_bottom", "zoom_top", "zoom_center", "translate_vertical_reflect", "translate_horizontal_reflect",
                 "rotate"]
    
    for transform in functions:
        try:
            result = eval(transform)(img)
            result_img = result['image']
            print(transform)
            cv2.imwrite(f"result_{transform}.jpg", result_img)
            out1.append(f"result_{transform}.jpg")
        except:
            pass
    return {'augmented_img_path': out1}

#compute()


def test():
    """Test the compute function."""

    print("Running test")
