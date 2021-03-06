// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.9.0;

import "./ERC20.sol";

contract ChainIdentification is ERC20 {
    // khi địa chỉ hợp lệ thì active = 1
    uint8 constant ACTIVE = 1;
    // khi địa chỉ được reject khỏi liên kết
    uint8 constant REJECTED = 0;

    // mỗi một tài khoản gồm thông tin địa chỉ, tình trạng đã ký hay chưa, và thông tin id để truy vấn mapping
    struct Account {
        string _type;
        address _address;
        uint8 _status;
    }

    // sự kiện xác thực chuỗi chéo thành công
    event TransactionComplete(address indexed from, uint256 random);
    event VerifyComplete(address indexed from, address indexed to);

    // khai báo mapping các chain của các mạng thông dụng
    mapping(uint8 => string) public infuralNetworks;

    // khai báo địa chỉ của hợp đồng
    address private _address;
    // khai báo biến mapping giữa một id ngẫu nhiên với mảng các địa chỉ được định danh cùng nhau
    mapping(uint256 => Account[]) private account;

    constructor() ERC20("Identity Token", "IT", 10E5) {
        _address = address(this);
        infuralNetworks[0x01] = "mainnet";
        infuralNetworks[0x03] = "ropsten";
        infuralNetworks[0x04] = "rinkeby";
        infuralNetworks[0x05] = "goerli";
        infuralNetworks[0x2a] = "kovan";
    }

    // trả về địa chỉ của hợp đồng khi được deploy
    function addressContract() public view returns (address) {
        return _address;
    }

    // xác thực thông tin thông qua chữ ký và địa chỉ
    function verify(
        bytes32 message,
        bytes memory sig,
        address _addr
    ) public returns (bool) {
        if (getRecoveredAddress(sig, message) == _addr) {
            emit VerifyComplete(_address, _addr);
            return true;
        }
        return false;
    }

    // thêm vào nhóm liên kết có sẵn (id được cung cấp) một hoặc nhiều các địa chỉ khác
    function insertPayload(
        uint64 timestamp,
        bytes[] memory _data,
        bytes[] memory _sign,
        bytes32 root_hash,
        uint256 combineId
    ) public returns (bool) {
        // nếu thời gian gửi gói tin đi lại lớn hơn thời gian của block hình thành ở contract thì không hợp lệ
        if (timestamp <= 0) return false;
        uint256 count = _data.length;

        for (uint256 i = 0; i < count; i++) {
            address addr;
            bytes memory data = _data[i];
            assembly {
                addr := mload(add(data, 21))
            }
            if (!verify(root_hash, _sign[i], addr)) {
                return false;
            }
        }

        for (uint256 i = 0; i < count; i++) {
            address addr;
            bytes memory data = _data[i];
            uint8 type_account = uint8(bytes1(data));

            assembly {
                addr := mload(add(data, 21))
            }
            // khởi tạo thông tin account
            Account memory temp;
            // gồm thông tin đỉa chỉ
            temp._address = addr;
            // thông tin của mạng tham gia
            temp._type = infuralNetworks[type_account];
            // tình trạng xác thực trong nhóm account
            temp._status = ACTIVE;

            uint256 existCount = account[combineId].length;
            bool exist = false;

            for (uint256 j = 0; j < existCount; j++) {
                if (account[combineId][j]._address == addr) {
                    exist = true;
                    break;
                }
            }

            if (exist) {
                continue;
            }

            account[combineId].push(temp);
        }

        emit TransactionComplete(_address, combineId);

        return true;
    }

    // xác thực thông tin của gói thông tin đồng thời tạo nhóm liên kết các địa chỉ
    function verifyPayload(
        // thời gian gói tin bắt đầu được gửi đi
        uint64 timestamp,
        // _data bao gồm thông tin chainId và địa chỉ của người dùng
        bytes[] memory _data,
        // _sign bao gồm chữ ký của root_hash ứng với từng khóa riêng tương ứng
        bytes[] memory _sign,
        // root_hash là dữ liệu đã bị mã hóa
        bytes32 root_hash
    ) public returns (bool) {
        // nếu thời gian gửi gói tin đi lại lớn hơn thời gian của block hình thành ở contract thì không hợp lệ
        if (timestamp <= 0) return false;
        // khởi tạo một giá trị ngẫu nhiên làm id cho nhóm account cần xác thực
        uint256 random = randomize();
        while (account[random].length > 0) {
            random = randomize();
        }
        uint256 count = _data.length;

        for (uint256 i = 0; i < count; i++) {
            address addr;
            bytes memory data = _data[i];
            assembly {
                addr := mload(add(data, 21))
            }
            if (!verify(root_hash, _sign[i], addr)) {
                return false;
            }
        }

        for (uint256 i = 0; i < count; i++) {
            address addr;
            bytes memory data = _data[i];
            uint8 type_account = uint8(bytes1(data));

            assembly {
                addr := mload(add(data, 21))
            }
            // khởi tạo thông tin account
            Account memory temp;
            // gồm thông tin đỉa chỉ
            temp._address = addr;
            // thông tin của mạng tham gia
            temp._type = infuralNetworks[type_account];
            // tình trạng xác thực trong nhóm account
            temp._status = ACTIVE;

            account[random].push(temp);
        }

        emit TransactionComplete(_address, random);

        return true;
    }

    // lấy thông tin của địa chỉ ứng với chữ ký và dữ liệu đã ký
    function getRecoveredAddress(bytes memory sig, bytes32 dataHash)
        public
        pure
        returns (address addr)
    {
        bytes32 ra;
        bytes32 sa;
        uint8 va;

        // Check the signature length
        if (sig.length != 65) {
            return (address(0));
        }

        // Divide the signature in r, s and v variables
        assembly {
            ra := mload(add(sig, 32))
            sa := mload(add(sig, 64))
            va := byte(0, mload(add(sig, 96)))
        }

        if (va < 27) {
            va += 27;
        }

        if (va != 27 && va != 28) {
            return (address(0));
        } else {
            return ecrecover(dataHash, va, ra, sa);
        }
    }

    // hàm lấy ra một giá trị ngẫu nhiên
    function randomize() private view returns (uint256) {
        uint256 randomHash = uint256(
            keccak256(abi.encodePacked(block.difficulty, block.timestamp))
        );
        return randomHash % 1000;
    }

    // từ chối, ngắt địa chí ví khỏi chuỗi liên kết các địa chỉ
    function rejectAddress(uint256 id, address addr)
        public
        virtual
        returns (bool)
    {
        uint256 count = account[id].length;
        for (uint256 i = 0; i < count; i++) {
            if (account[id][i]._address == addr) {
                account[id][i]._status = REJECTED;
                return true;
            }
        }
        return false;
    }

    // khôi phục lại địa chỉ ví trong chuỗi liên kết các địa chỉ
    function recoverAddress(uint256 id, address addr)
        public
        virtual
        returns (bool)
    {
        uint256 count = account[id].length;
        for (uint256 i = 0; i < count; i++) {
            if (account[id][i]._address == addr) {
                account[id][i]._status = ACTIVE;
                return true;
            }
        }
        return false;
    }

    // lấy thông tin của nhóm địa chỉ có id được cung cấp
    function getInfo(uint256 id) public view returns (Account[] memory) {
        return account[id];
    }

    // xóa nhóm địa chỉ đã liên kết với id được cung cấp
    function removeGroup(uint256 id) public virtual returns (bool) {
        delete account[id];
        return true;
    }

    // tính tổng số dư token của nhóm địa chỉ dựa vào id được cung cấp
    function sumBalance(uint256 id) public view returns (uint256) {
        uint256 sum = 0;
        uint256 count = account[id].length;
        for (uint256 i = 0; i < count; i++) {
            if (account[id][i]._status == ACTIVE) {
                sum += balanceOf(account[id][i]._address);
            }
        }
        return sum;
    }
}
