# For recommendation system/API
POST /api/recommend

inputs: 
```json
{
  "user_id": "eda0dbbc-e255-4aec-9d13-dceb3e01ecdb",
  "start_point": { "lat": 10.77, "lng": 106.69 },
  "end_point": { "lat": 10.78, "lng": 106.70 },
  "preferences": {
    "budget_level": "medium",
    "travel_pace": "moderate",
    "preferred_categories": []
  },
  "max_stops": 3
}
```

outputs:
```json
{
    "user_id": "eda0dbbc-e255-4aec-9d13-dceb3e01ecdb",
    "start_point": {
        "lat": 10.77,
        "lng": 106.69
    },
    "total_locations": 8,
    "recommendations": [
        {
            "location_id": "c536704a-f4f1-4c11-9769-af79dd1598fd",
            "name": "War Remnants Museum",
            "name_vi": "Bảo tàng Chứng tích chiến tranh",
            "address": "28 Võ Văn Tần",
            "district": "District 3",
            "rating": 4.7,
            "review_count": 4500,
            "coordinates": {
                "lat": 10.779,
                "lng": 106.6923
            },
            "categories": [
                "Historical",
                "Café",
                "Shopping"
            ],
            "categories_vi": [
                "Lịch sử",
                "Quán cà phê",
                "Mua sắm"
            ],
            "score": 0.8188866716518967,
            "breakdown": {
                "distance": 0.8968190618625622,
                "rating": 0.9400000000000001,
                "category": 0.5,
                "popularity": 1.0,
                "history": 0.7
            }
        },
        {
            "location_id": "15a057cc-0920-4f7e-b718-b85b32f59a44",
            "name": "Takashimaya",
            "name_vi": "Takashimaya",
            "address": "92 Nam Kỳ Khởi Nghĩa",
            "district": "District 1",
            "rating": 4.6,
            "review_count": 3900,
            "coordinates": {
                "lat": 10.7734,
                "lng": 106.699
            },
            "categories": [
                "Entertainment",
                "Café",
                "Shopping"
            ],
            "categories_vi": [
                "Giải trí",
                "Quán cà phê",
                "Mua sắm"
            ],
            "score": 0.8131342187763937,
            "breakdown": {
                "distance": 0.8946691965039824,
                "rating": 0.9199999999999999,
                "category": 0.5,
                "popularity": 1.0,
                "history": 0.7
            }
        },
        {
            "location_id": "be1b38b6-b8ea-4ca9-89e0-feb42ba8eb17",
            "name": "Central Post Office",
            "name_vi": "Bưu Điện Thành Phố",
            "address": "02 Paris Square",
            "district": "District 1",
            "rating": 4.8,
            "review_count": 2000,
            "coordinates": {
                "lat": 10.7805,
                "lng": 106.6994
            },
            "categories": [
                "Historical",
                "Café"
            ],
            "categories_vi": [
                "Lịch sử",
                "Quán cà phê"
            ],
            "score": 0.8055810266448188,
            "breakdown": {
                "distance": 0.8445172189851968,
                "rating": 0.96,
                "category": 0.5,
                "popularity": 1.0,
                "history": 0.7
            }
        }
    ]
}
```


## Output dùng cho:
## ✔ 1. Cho web UI

* Hiển thị danh sách địa điểm gợi ý cho người dùng: tên, rating, khoảng cách, phân loại.

* Sắp xếp theo độ phù hợp nhất.

## ✔ 2. Cho AI Chat Assistant

### Dữ liệu được format gọn – rõ – đủ thông tin để AI:

* mô tả địa điểm theo nhu cầu người dùng,

* so sánh 2–3 địa điểm,

* lập lịch trình dựa trên các địa điểm gợi ý,

* đưa lời khuyên (“Bạn thích lịch sử? Tôi đề xuất Nhà thờ Đức Bà và Bảo tàng Chứng tích Chiến tranh”).

## ✔ 3. Cho việc tạo lộ trình (Route Engine)

* coordinates dùng để tính khoảng cách & thời gian di chuyển.

* score dùng để chọn top điểm phù hợp nhất.



## Note:
* đã test trên seed_data.sql
* chưa sử dụng các API geocoding, routing nên chỉ score mang tính chất tương đối.
